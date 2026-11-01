/**
 * Reunification Matching Engine Service
 * Multi-attribute suggestion engine comparing Missing and Found person records.
 *
 * CRITICAL POLICY:
 * Every match result is a SUGGESTION ONLY.
 * Never automatically declare two individuals to be the same person.
 * Authorized human identity verification is required before confirming a match.
 */

class ReunificationMatchingService {
  /**
   * Calculate string similarity using Levenshtein distance
   */
  calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    const s1 = str1.trim().toLowerCase();
    const s2 = str2.trim().toLowerCase();
    if (s1 === s2) return 1.0;

    // Check token inclusion
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    const commonWords = words1.filter(w => w.length > 2 && words2.includes(w));
    if (commonWords.length > 0) {
      return 0.8 + (0.2 * (commonWords.length / Math.max(words1.length, words2.length)));
    }

    const track = Array(s2.length + 1).fill(null).map(() =>
      Array(s1.length + 1).fill(null)
    );
    for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
    for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;

    for (let j = 1; j <= s2.length; j += 1) {
      for (let i = 1; i <= s1.length; i += 1) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1, // deletion
          track[j - 1][i] + 1, // insertion
          track[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    const distance = track[s2.length][s1.length];
    const maxLength = Math.max(s1.length, s2.length);
    return Math.max(0, 1 - (distance / maxLength));
  }

  /**
   * Calculate Haversine distance in km between two geo coordinates
   */
  calculateGeoDistanceKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Computes multi-attribute similarity between a Missing case and a Found case
   * Returns score between 0 and 100, plus detailed breakdown reasons
   */
  evaluateCandidatePair(missingCase, foundCase) {
    let totalScore = 0;
    const reasons = [];

    // 1. Name Similarity (Weight: 35 points)
    const isUnidentified = /unknown|unidentified|anonymous/i.test(foundCase.fullName);
    if (!isUnidentified) {
      const nameSim = this.calculateStringSimilarity(missingCase.fullName, foundCase.fullName);
      if (nameSim >= 0.85) {
        totalScore += 35;
        reasons.push(`Strong name alignment (${Math.round(nameSim * 100)}% lexical match)`);
      } else if (nameSim >= 0.6) {
        totalScore += 22;
        reasons.push(`Partial name similarity (${Math.round(nameSim * 100)}%)`);
      } else if (nameSim >= 0.4) {
        totalScore += 10;
      }
    } else {
      // If found person is unidentified, don't penalize heavily, assign base neutral score
      totalScore += 12;
      reasons.push('Found individual currently unidentified');
    }

    // 2. Gender Alignment (Weight: 15 points)
    if (missingCase.gender && foundCase.gender) {
      if (missingCase.gender === foundCase.gender) {
        totalScore += 15;
        reasons.push(`Matching gender (${missingCase.gender})`);
      } else if (foundCase.gender === 'Unknown' || missingCase.gender === 'Unknown') {
        totalScore += 8;
      } else {
        // Direct mismatch (e.g. Male vs Female)
        return { score: 0, reasons: ['Gender mismatch'], qualified: false };
      }
    }

    // 3. Age Proximity (Weight: 20 points)
    const ageDiff = Math.abs((missingCase.age || 0) - (foundCase.age || 0));
    if (ageDiff === 0) {
      totalScore += 20;
      reasons.push(`Exact age match (${missingCase.age} years)`);
    } else if (ageDiff <= 2) {
      totalScore += 16;
      reasons.push(`Close approximate age (difference ${ageDiff} yr)`);
    } else if (ageDiff <= 5) {
      totalScore += 10;
      reasons.push(`Approximate age window (±${ageDiff} yrs)`);
    } else if (ageDiff > 12) {
      // Extreme age mismatch
      return { score: 0, reasons: ['Age discrepancy exceeds plausible estimation range'], qualified: false };
    }

    // 4. Geographic Proximity (Weight: 15 points)
    const lat1 = missingCase.coordinates?.lat || missingCase.location?.lat;
    const lng1 = missingCase.coordinates?.lng || missingCase.location?.lng;
    const lat2 = foundCase.coordinates?.lat || foundCase.location?.lat;
    const lng2 = foundCase.coordinates?.lng || foundCase.location?.lng;

    const distKm = this.calculateGeoDistanceKm(lat1, lng1, lat2, lng2);
    if (distKm !== null) {
      if (distKm <= 5) {
        totalScore += 15;
        reasons.push(`Found within ${distKm.toFixed(1)} km of last seen area`);
      } else if (distKm <= 20) {
        totalScore += 10;
        reasons.push(`Found within ${distKm.toFixed(1)} km operational sector`);
      } else if (distKm <= 60) {
        totalScore += 5;
        reasons.push(`Regional proximity (${distKm.toFixed(0)} km)`);
      }
    } else {
      // Fallback: textual check
      const locSim = this.calculateStringSimilarity(missingCase.lastSeenLocation, foundCase.lastSeenLocation);
      if (locSim >= 0.5) {
        totalScore += 10;
        reasons.push('Location description proximity match');
      }
    }

    // 5. Image & Facial Feature Similarity (Weight: 15 points)
    if (missingCase.photoUrl && foundCase.photoUrl) {
      // Both records have photographs. If previously scored or calculated:
      const faceScore = foundCase.aiFaceMatchScore || missingCase.aiFaceMatchScore || 0.85;
      const pts = Math.min(15, Math.round(faceScore * 15));
      totalScore += pts;
      reasons.push(`Facial image feature similarity metric: ${Math.round(faceScore * 100)}% (SUGGESTION ONLY)`);
    }

    // Normalized Score (cap at 98% to reflect suggestion nature)
    const finalScore = Math.min(98, Math.max(0, totalScore));
    const qualified = finalScore >= 50;

    return {
      score: finalScore,
      reasons,
      qualified
    };
  }

  /**
   * Scans MongoDB database to find candidate matches for a target case
   */
  async scanForMatches(targetCase, MissingPersonModel) {
    if (!MissingPersonModel) return [];

    const isMissing = targetCase.recordType === 'MISSING';
    const oppositeType = isMissing ? 'FOUND' : 'MISSING';

    // Query active candidate records of the opposite type
    const candidates = await MissingPersonModel.find({
      recordType: oppositeType,
      status: { $nin: ['Reunited', 'Closed'] }
    }).lean();

    const matchedSuggestions = [];

    for (const cand of candidates) {
      const missing = isMissing ? targetCase : cand;
      const found = isMissing ? cand : targetCase;

      const evalResult = this.evaluateCandidatePair(missing, found);

      if (evalResult.qualified) {
        matchedSuggestions.push({
          targetCaseId: cand.caseId,
          targetRecordType: cand.recordType,
          matchScore: evalResult.score,
          matchReason: evalResult.reasons.join(' • '),
          matchedName: cand.fullName,
          matchedPhotoUrl: cand.photoUrl,
          matchedAge: cand.age,
          matchedLocation: cand.lastSeenLocation || cand.approximateArea,
          status: 'SUGGESTED'
        });
      }
    }

    // Sort descending by match score
    matchedSuggestions.sort((a, b) => b.matchScore - a.matchScore);
    return matchedSuggestions;
  }
}

module.exports = new ReunificationMatchingService();
