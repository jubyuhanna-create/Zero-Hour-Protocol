// Zero Hour Protocol: real heart rate from a MAX30102 sensor, sent to the ship database.
// Board: ESP32 DevKit V1 or ESP32-Wrover. Sensor: MAX30102 on I2C (SDA 21, SCL 22, 3.3V, GND).
// Library: "SparkFun MAX3010x Pulse and Proximity Sensor Library" (Arduino Library Manager).
//
// Every 5 seconds it posts {"crew_id":"PLT","hr":72,"source":"esp32"} to /api/telemetry.
// The server triages the reading, stores it, and the dashboard shows it as a live sensor.

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"

const char* WIFI_SSID   = "YOUR_WIFI";
const char* WIFI_PASS   = "YOUR_PASSWORD";
const char* API_URL     = "https://YOUR-APP.vercel.app/api/telemetry";
const char* DEVICE_KEY  = "SAME_AS_DEVICE_KEY_ON_VERCEL";
const char* CREW_ID     = "PLT";   // CDR, PLT, FE or MO

MAX30105 sensor;
const byte AVG = 6;
byte rates[AVG]; byte rateSpot = 0; byte filled = 0;
long lastBeat = 0;
int beatAvg = 0;
unsigned long lastSend = 0;

void setup() {
  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("WiFi");
  while (WiFi.status() != WL_CONNECTED) { delay(400); Serial.print("."); }
  Serial.println(" connected");

  if (!sensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("MAX30102 not found, check wiring");
    while (true) delay(1000);
  }
  sensor.setup();                      // default settings
  sensor.setPulseAmplitudeRed(0x0A);   // low red LED, just enough to see a finger
  sensor.setPulseAmplitudeGreen(0);
}

void sendReading(int hr) {
  WiFiClientSecure client;
  client.setInsecure();                // fine for a hackathon prototype, pin the certificate in real use
  HTTPClient http;
  http.begin(client, API_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-key", DEVICE_KEY);
  String body = String("{\"crew_id\":\"") + CREW_ID + "\",\"hr\":" + hr + ",\"source\":\"esp32\"}";
  int code = http.POST(body);
  Serial.printf("HR %d sent, server answered %d: %s\n", hr, code, http.getString().c_str());
  http.end();
}

void loop() {
  long ir = sensor.getIR();
  bool finger = ir > 50000;

  if (finger && checkForBeat(ir)) {
    long delta = millis() - lastBeat;
    lastBeat = millis();
    float bpm = 60 / (delta / 1000.0);
    if (bpm > 30 && bpm < 220) {
      rates[rateSpot++] = (byte)bpm;
      rateSpot %= AVG;
      if (filled < AVG) filled++;
      int sum = 0;
      for (byte i = 0; i < filled; i++) sum += rates[i];
      beatAvg = sum / filled;
    }
  }
  if (!finger) { filled = 0; beatAvg = 0; }

  if (millis() - lastSend > 5000) {
    lastSend = millis();
    if (beatAvg > 0 && filled >= 3 && WiFi.status() == WL_CONNECTED) sendReading(beatAvg);
    else Serial.println(finger ? "Measuring..." : "Place your finger on the sensor");
  }
}
