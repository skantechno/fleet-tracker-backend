import mqtt, { type MqttClient } from 'mqtt';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { setConnectionState } from '../state/connectionState.js';
import { handleMessage } from './handler.js';

const TOPICS = ['vehicles/+/telemetry', 'vehicles/+/status'];

export function startMqtt(): MqttClient {
  const client = mqtt.connect(config.MQTT_URL, {
    clientId: config.MQTT_CLIENT_ID,
    username: config.MQTT_USERNAME || undefined,
    password: config.MQTT_PASSWORD || undefined,
    reconnectPeriod: 2000,
    clean: true,
  });

  client.on('connect', () => {
    logger.info('MQTT connected');
    setConnectionState('mqtt', 'connected');
    client.subscribe(TOPICS, { qos: 1 }, (err) => {
      if (err) {
        logger.error({ err }, 'MQTT subscribe failed');
        return;
      }
      logger.info({ topics: TOPICS }, 'MQTT subscribed');
    });
  });

  client.on('message', (topic, payload) => {
    handleMessage(topic, payload);
  });

  client.on('reconnect', () => {
    logger.warn('MQTT reconnecting');
  });

  client.on('close', () => {
    setConnectionState('mqtt', 'disconnected');
  });

  client.on('error', (err) => {
    logger.error({ err }, 'MQTT error');
  });

  return client;
}
