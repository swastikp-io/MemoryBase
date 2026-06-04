import test from 'node:test';
import assert from 'node:assert/strict';
import { SystemAudioAgent } from './SystemAudioAgent.ts';
import loudness from 'loudness';

const originalGetVolume = loudness.getVolume;
const originalSetVolume = loudness.setVolume;

function mockLoudness(getVol: number | Error, setVolSuccess = true) {
  loudness.getVolume = async () => {
    if (getVol instanceof Error) throw getVol;
    return getVol;
  };
  loudness.setVolume = async (vol: number) => {
    if (!setVolSuccess) throw new Error("Mock set error");
  };
}

test('SystemAudioAgent - Decrease', async (t) => {
  const agent = new SystemAudioAgent();

  await t.test('Lower volume by 20%', async () => {
    mockLoudness(100);
    const result = await agent.adjustVolume({ operation: 'decrease', percentage: 20 });
    assert.equal(result.success, true);
    assert.equal(result.newVolume, 80);
    assert.equal(result.message, 'Volume lowered by 20 percent. Current volume is 80 percent.');
  });

  await t.test('Lower volume by 50%', async () => {
    mockLoudness(100);
    const result = await agent.adjustVolume({ operation: 'decrease', percentage: 50 });
    assert.equal(result.success, true);
    assert.equal(result.newVolume, 50);
  });

  await t.test('Lower volume by 100%', async () => {
    mockLoudness(80);
    const result = await agent.adjustVolume({ operation: 'decrease', percentage: 100 });
    assert.equal(result.success, true);
    assert.equal(result.newVolume, 0);
  });

  await t.test('Invalid percentage (0)', async () => {
    const result = await agent.adjustVolume({ operation: 'decrease', percentage: 0 });
    assert.equal(result.success, false);
    assert.equal(result.message, 'Please specify a percentage between 1 and 100.');
  });

  await t.test('Invalid percentage (150)', async () => {
    const result = await agent.adjustVolume({ operation: 'decrease', percentage: 150 });
    assert.equal(result.success, false);
    assert.equal(result.message, 'Please specify a percentage between 1 and 100.');
  });

  await t.test('Missing percentage', async () => {
    const result = await agent.adjustVolume({ operation: 'decrease', percentage: undefined as unknown as number });
    assert.equal(result.success, false);
    assert.equal(result.message, 'Please specify a percentage between 1 and 100.');
  });

  await t.test('Volume already at 0', async () => {
    mockLoudness(0);
    const result = await agent.adjustVolume({ operation: 'decrease', percentage: 20 });
    assert.equal(result.success, true);
    assert.equal(result.newVolume, 0);
  });

  await t.test('Volume change failure', async () => {
    mockLoudness(50, false);
    const result = await agent.adjustVolume({ operation: 'decrease', percentage: 20 });
    assert.equal(result.success, false);
    assert.equal(result.message, "I couldn't adjust the system volume.");
  });

  await t.test('Volume read failure', async () => {
    mockLoudness(new Error("Read error"));
    const result = await agent.adjustVolume({ operation: 'decrease', percentage: 20 });
    assert.equal(result.success, false);
    assert.equal(result.message, "I couldn't access the system volume settings.");
  });
});

test('SystemAudioAgent - Increase', async (t) => {
  const agent = new SystemAudioAgent();

  await t.test('Increase volume by 20%', async () => {
    mockLoudness(40);
    const result = await agent.adjustVolume({ operation: 'increase', percentage: 20 });
    assert.equal(result.success, true);
    assert.equal(result.newVolume, 48); // 40 * 1.2
    assert.equal(result.message, 'Volume increased by 20 percent. Current volume is 48 percent.');
  });

  await t.test('Increase volume by 50%', async () => {
    mockLoudness(40);
    const result = await agent.adjustVolume({ operation: 'increase', percentage: 50 });
    assert.equal(result.success, true);
    assert.equal(result.newVolume, 60); // 40 * 1.5
  });

  await t.test('Increase volume by 100%', async () => {
    mockLoudness(40);
    const result = await agent.adjustVolume({ operation: 'increase', percentage: 100 });
    assert.equal(result.success, true);
    assert.equal(result.newVolume, 80); // 40 * 2.0
  });

  await t.test('Volume exceeds 100% and is clamped', async () => {
    mockLoudness(80);
    const result = await agent.adjustVolume({ operation: 'increase', percentage: 50 });
    assert.equal(result.success, true);
    assert.equal(result.newVolume, 100); // 80 * 1.5 = 120 -> clamped to 100
  });

  await t.test('Invalid percentage (0)', async () => {
    const result = await agent.adjustVolume({ operation: 'increase', percentage: 0 });
    assert.equal(result.success, false);
    assert.equal(result.message, 'Please specify a percentage between 1 and 100.');
  });

  await t.test('Invalid percentage (150)', async () => {
    const result = await agent.adjustVolume({ operation: 'increase', percentage: 150 });
    assert.equal(result.success, false);
    assert.equal(result.message, 'Please specify a percentage between 1 and 100.');
  });

  await t.test('Missing percentage', async () => {
    const result = await agent.adjustVolume({ operation: 'increase', percentage: undefined as unknown as number });
    assert.equal(result.success, false);
    assert.equal(result.message, 'Please specify a percentage between 1 and 100.');
  });

  await t.test('Volume change failure', async () => {
    mockLoudness(50, false);
    const result = await agent.adjustVolume({ operation: 'increase', percentage: 20 });
    assert.equal(result.success, false);
    assert.equal(result.message, "I couldn't adjust the system volume.");
  });

  await t.test('Volume read failure', async () => {
    mockLoudness(new Error("Read error"));
    const result = await agent.adjustVolume({ operation: 'increase', percentage: 20 });
    assert.equal(result.success, false);
    assert.equal(result.message, "I couldn't access the system volume settings.");
  });
});
