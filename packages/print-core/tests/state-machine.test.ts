import { ConnectionStateMachine } from '../src/state-machine';
import { ConnectionTransitionEvent } from '../src/types';
import { FakePrinterConnection } from './fakes';

describe('ConnectionStateMachine', () => {
  let fakeConn: FakePrinterConnection;
  let sm: ConnectionStateMachine;

  beforeEach(() => {
    fakeConn = new FakePrinterConnection();
    sm = new ConnectionStateMachine(fakeConn);
  });

  test('initial state should be DISCONNECTED', () => {
    expect(sm.getState()).toBe('DISCONNECTED');
  });

  test('should notify listeners and serialize transitions in order', async () => {
    const transitions: ConnectionTransitionEvent[] = [];
    sm.onTransition((event) => transitions.push(event));

    await sm.transitionTo('CONNECTING', 'User pressed connect');
    await sm.transitionTo('CONNECTED', 'Handshake verified');
    await sm.transitionTo('PRINTING', 'Starting print job');
    await sm.transitionTo('CONNECTED', 'Print completed');

    expect(sm.getState()).toBe('CONNECTED');
    expect(transitions).toHaveLength(4);
    expect(transitions[0]).toMatchObject({
      from: 'DISCONNECTED',
      to: 'CONNECTING',
      reason: 'User pressed connect'
    });
    expect(transitions[1]).toMatchObject({
      from: 'CONNECTING',
      to: 'CONNECTED'
    });
    expect(transitions[2]).toMatchObject({
      from: 'CONNECTED',
      to: 'PRINTING'
    });
    expect(transitions[3]).toMatchObject({
      from: 'PRINTING',
      to: 'CONNECTED'
    });
  });

  test('should handle write failure by transitioning to RECONNECTING then CONNECTED on successful reconnect', async () => {
    const states: string[] = [];
    sm.onTransition((e) => states.push(`${e.from}->${e.to}`));

    await sm.transitionTo('CONNECTED');
    fakeConn.isConnected = true;

    // Simulate write failure trigger
    const reconnected = await sm.handleWriteFailure('Write socket closed');

    expect(reconnected).toBe(true);
    expect(sm.getState()).toBe('CONNECTED');
    expect(states).toContain('CONNECTED->RECONNECTING');
    expect(states).toContain('RECONNECTING->CONNECTED');
  });

  test('should transition to DISCONNECTED if reconnect attempt fails', async () => {
    const states: string[] = [];
    sm.onTransition((e) => states.push(`${e.from}->${e.to}`));

    await sm.transitionTo('CONNECTED');
    fakeConn.shouldFailConnect = true;

    const reconnected = await sm.handleWriteFailure('Connection dropped');

    expect(reconnected).toBe(false);
    expect(sm.getState()).toBe('DISCONNECTED');
    expect(states).toContain('RECONNECTING->DISCONNECTED');
  });

  test('should transition to DISCONNECTED when underlying connection fires onDisconnect', async () => {
    await sm.transitionTo('CONNECTED');
    fakeConn.isConnected = true;

    fakeConn.simulateDisconnect('Device out of Bluetooth range');

    // Give microtask tick to let async handler settle
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(sm.getState()).toBe('DISCONNECTED');
  });
});
