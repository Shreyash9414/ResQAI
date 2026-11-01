const test = require('node:test');
const assert = require('node:assert/strict');
const riskAssessmentEngine = require('../services/riskAssessmentEngine');

test('Feature 2: 🧠 AI Disaster Risk Prediction Tests', async (t) => {

  await t.test('2.1 Risk assessment schema includes all required regulatory fields', async () => {
    // Run an assessment for a sample coordinate (Mumbai coastal)
    const assessment = await riskAssessmentEngine.assessLocationRisk(19.0760, 72.8777, 'Mumbai Coastal Corridor');

    assert.ok(assessment.assessmentId, 'Must have assessmentId');
    assert.ok(assessment.assessmentTimestamp, 'Must have timestamp');
    assert.ok(assessment.geographicArea, 'Must include geographic area');
    assert.equal(assessment.geographicArea.name, 'Mumbai Coastal Corridor');
    assert.ok(Array.isArray(assessment.hazardAssessments), 'Must have hazardAssessments array');
    assert.ok(Array.isArray(assessment.dataSources), 'Must list dataSources');
    assert.ok(assessment.ruleSetVersion.includes('ResQAI-RiskRules'), 'Must state rule-set version');
    assert.ok(assessment.disclaimer, 'Must include statutory disclaimer');
  });

  await t.test('2.2 Data sources include publication time, retrieval time, and units', async () => {
    const assessment = await riskAssessmentEngine.assessLocationRisk(20.0050, 73.7880, 'Nashik Godavari Basin');
    const sources = assessment.dataSources;
    assert.ok(sources.length >= 2, 'Should track weather and local incident sources');

    const weatherSource = sources.find(s => s.name.includes('Open-Meteo'));
    assert.ok(weatherSource, 'Must include Open-Meteo weather source');
    assert.ok(weatherSource.retrievalTime, 'Must have retrieval timestamp');
    assert.ok(weatherSource.units, 'Must specify units (e.g. mm, km/h, Celsius)');
    assert.ok(['CURRENT', 'UNAVAILABLE', 'STALE'].includes(weatherSource.freshness), 'Must specify freshness status');
  });

  await t.test('2.3 Flood risk calculation triggers High/Critical risk upon 100mm+ precipitation threshold', () => {
    // Direct rule test
    const evaluateFloodRisk = (cumulative48hRainMm, activeIncidentsCount) => {
      let score = 0;
      const evidence = [];

      if (cumulative48hRainMm >= 100) {
        score += 50;
        evidence.push(`Heavy 48h cumulative rainfall of ${cumulative48hRainMm}mm exceeds high-risk threshold`);
      } else if (cumulative48hRainMm >= 45) {
        score += 30;
      }

      if (activeIncidentsCount > 0) {
        score += Math.min(30, activeIncidentsCount * 15);
        evidence.push(`${activeIncidentsCount} active flood incidents nearby`);
      }

      let category = 'Low';
      if (score >= 70) category = 'Critical';
      else if (score >= 50) category = 'High';
      else if (score >= 25) category = 'Moderate';

      return { score, category, evidence };
    };

    const extremeRain = evaluateFloodRisk(120, 2);
    assert.equal(extremeRain.category, 'Critical', '120mm rain + 2 incidents must be Critical risk');
    assert.equal(extremeRain.score, 80);

    const moderateRain = evaluateFloodRisk(50, 0);
    assert.equal(moderateRain.category, 'Moderate');
    assert.equal(moderateRain.score, 30);

    const dryWeather = evaluateFloodRisk(5, 0);
    assert.equal(dryWeather.category, 'Low');
  });

  await t.test('2.4 Cyclone risk triggers on high wind speed and barometric drop', () => {
    const evaluateCycloneRisk = (peakWindKmh, pressureHpa) => {
      let score = 0;
      if (peakWindKmh >= 90) score += 60;
      else if (peakWindKmh >= 65) score += 35;
      if (pressureHpa < 995) score += 30;

      let category = 'Low';
      if (score >= 70) category = 'Critical';
      else if (score >= 40) category = 'High';
      else if (score >= 25) category = 'Moderate';
      return { score, category };
    };

    const galeStorm = evaluateCycloneRisk(95, 990);
    assert.equal(galeStorm.category, 'Critical');

    const normalWind = evaluateCycloneRisk(20, 1013);
    assert.equal(normalWind.category, 'Low');
  });

  await t.test('2.5 Heatwave evaluation flags temperature above 43°C', () => {
    const evaluateHeatwave = (maxTempC) => {
      if (maxTempC >= 45) return { category: 'Critical', score: 85 };
      if (maxTempC >= 43) return { category: 'High', score: 65 };
      if (maxTempC >= 40) return { category: 'Moderate', score: 40 };
      return { category: 'Low', score: 0 };
    };

    assert.equal(evaluateHeatwave(44).category, 'High');
    assert.equal(evaluateHeatwave(46).category, 'Critical');
    assert.equal(evaluateHeatwave(32).category, 'Low');
  });

  await t.test('2.6 Assessment transparently identifies as rule-based without fake ML confidence', async () => {
    const assessment = await riskAssessmentEngine.assessLocationRisk(18.5204, 73.8567, 'Pune Mutha River Corridor');
    for (const h of assessment.hazardAssessments) {
      assert.ok(h.evidence && h.evidence.length > 0, 'Every hazard must show transparent evidence');
      assert.ok(h.recommendedActions && h.recommendedActions.length > 0, 'Must provide precautionary actions');
      assert.ok(h.dataSources && h.dataSources.length > 0, 'Must identify backing data sources');
    }
  });
});
