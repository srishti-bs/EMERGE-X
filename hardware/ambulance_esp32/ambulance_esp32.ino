/*
 * EMERGE-X — Physical Emergency Trigger & Ambulance Controller Firmware
 * Platform: ESP32 DevKit V1 (Arduino Core)
 * 
 * Hardware Setup:
 * 1. Physical Push Button:
 *    - Connected between GPIO 4 and GND
 *    - Uses internal INPUT_PULLUP (Active-LOW: pressed = 0, idle = 1)
 * 2. Onboard Status LED:
 *    - GPIO 2 (Blinks on press, solid ON on successful emergency corridor activation)
 * 3. (Optional) GPS Module (NEO-6M):
 *    - HardwareSerial UART2: RX2 = GPIO 16 (to GPS TX), TX2 = GPIO 17 (to GPS RX), 9600 baud
 * 
 * Backend Contract:
 * - Method: POST http://<BACKEND_HOST>:8000/api/v1/emergency/trigger
 * - Payload: {"ambulance_id": "AX-01", "trigger_source": "PUSH_BUTTON", "timestamp": 0}
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>

// ==========================================
// 1. CONFIGURATION: WI-FI & BACKEND
// ==========================================
// Enter your local Wi-Fi credentials:
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Enter your computer's LAN IP (run 'ipconfig' on Windows; do NOT use 127.0.0.1 or localhost):
const char* BACKEND_HOST  = "192.168.1.100";
const int   BACKEND_PORT  = 8000;
const char* BACKEND_PATH  = "/api/v1/emergency/trigger";

// Ambulance Identifier:
const char* AMBULANCE_ID  = "AX-01";

// ==========================================
// 2. HARDWARE PINS
// ==========================================
const int BUTTON_PIN      = 4;   // Push Button connected to GPIO 4 (Active-LOW with pullup)
const int STATUS_LED_PIN  = 2;   // Onboard Blue LED for local feedback

// GPS UART Pins (Optional HardwareSerial UART2)
static const int GPS_RX_PIN = 16;
static const int GPS_TX_PIN = 17;
static const uint32_t GPS_BAUD = 9600;

TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

// ==========================================
// 3. TIMING & DEBOUNCE CONSTANTS
// ==========================================
const unsigned long DEBOUNCE_DELAY_MS   = 50;    // 50ms contact debounce
const unsigned long COOLDOWN_DELAY_MS   = 5000;  // 5-second lockout between repeated trigger events
const unsigned long TELEMETRY_INTERVAL  = 2000;  // 2-second periodic GPS telemetry (if fix available)

// State Tracking
int lastRawButtonState    = HIGH;
int debouncedButtonState  = HIGH;
unsigned long lastDebounceTime  = 0;
unsigned long lastTriggerTime   = 0;
unsigned long lastTelemetryTime = 0;
bool emergencyActiveLocal       = false;

// ==========================================
// 4. FUNCTION DECLARATIONS
// ==========================================
void connectWiFi();
bool sendEmergencyTrigger();
void sendGpsTelemetryIfAvailable();

// ==========================================
// 5. SETUP
// ==========================================
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n==================================================");
  Serial.println("   EMERGE-X: LIVE EMERGENCY CORE CONTROLLER       ");
  Serial.println("   Ambulance ID: " + String(AMBULANCE_ID));
  Serial.println("==================================================");

  // Initialize GPIO
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);

  // Initialize GPS UART
  gpsSerial.begin(GPS_BAUD, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

  // Connect to Local Wi-Fi
  connectWiFi();

  Serial.println("\n[READY] Push button armed on GPIO 4.");
  Serial.println("[READY] Press button to activate Live Emergency Green Corridor.\n");
}

// ==========================================
// 6. MAIN LOOP
// ==========================================
void loop() {
  // Ensure Wi-Fi stays connected
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // Continuously parse background GPS data
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  // --- Push Button Debounce & Trigger Handling ---
  int currentRaw = digitalRead(BUTTON_PIN);

  // If pin changed state, reset debounce timer
  if (currentRaw != lastRawButtonState) {
    lastDebounceTime = millis();
  }

  // Once stable for DEBOUNCE_DELAY_MS
  if ((millis() - lastDebounceTime) > DEBOUNCE_DELAY_MS) {
    // If the debounced state has changed
    if (currentRaw != debouncedButtonState) {
      debouncedButtonState = currentRaw;

      // Active-LOW: LOW means button is pressed down
      if (debouncedButtonState == LOW) {
        unsigned long now = millis();

        // Check cooldown to prevent duplicate spamming while pressed or immediately retried
        if (now - lastTriggerTime >= COOLDOWN_DELAY_MS) {
          Serial.println("\n[EVENT] >>> PHYSICAL PUSH BUTTON PRESSED (GPIO 4) <<<");
          lastTriggerTime = now;

          // Blink LED rapidly to indicate trigger transmission
          for (int i = 0; i < 3; i++) {
            digitalWrite(STATUS_LED_PIN, HIGH);
            delay(80);
            digitalWrite(STATUS_LED_PIN, LOW);
            delay(80);
          }

          // Send emergency trigger via HTTP POST to FastAPI backend
          bool success = sendEmergencyTrigger();
          if (success) {
            emergencyActiveLocal = true;
            digitalWrite(STATUS_LED_PIN, HIGH); // Solid ON indicates corridor ACTIVE
            Serial.println("[STATUS] Emergency corridor ACTIVE. LED confirmed.\n");
          } else {
            digitalWrite(STATUS_LED_PIN, LOW);
            Serial.println("[STATUS] Backend transmission failed. Check IP / WiFi.\n");
          }
        } else {
          unsigned long remainingSec = (COOLDOWN_DELAY_MS - (now - lastTriggerTime)) / 1000;
          Serial.printf("[DEBOUNCE/COOLDOWN] Duplicate trigger blocked. Cooldown remaining: %lu s\n", remainingSec);
        }
      }
    }
  }
  lastRawButtonState = currentRaw;

  // --- (Optional) Periodic GPS Telemetry Stream ---
  if (millis() - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = millis();
    sendGpsTelemetryIfAvailable();
  }
}

// ==========================================
// 7. HELPER: WI-FI CONNECTION
// ==========================================
void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(400);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected successfully!");
    Serial.printf("[WiFi] IP Address: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WiFi] Connection timeout. Retrying in background...");
  }
}

// ==========================================
// 8. HELPER: SEND EMERGENCY TRIGGER
// ==========================================
bool sendEmergencyTrigger() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP ERROR] Cannot send trigger: Wi-Fi disconnected");
    return false;
  }

  HTTPClient http;
  String url = "http://" + String(BACKEND_HOST) + ":" + String(BACKEND_PORT) + String(BACKEND_PATH);

  Serial.printf("[HTTP POST] Transmitting trigger to: %s\n", url.c_str());
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(4000); // 4-second network timeout

  // JSON payload according to backend contract
  String payload = "{\"ambulance_id\":\"" + String(AMBULANCE_ID) + "\","
                   "\"trigger_source\":\"PUSH_BUTTON\","
                   "\"timestamp\":0,"
                   "\"emergency_type\":\"CARDIAC_CRITICAL\","
                   "\"destination_junction_id\":\"J4\"}";

  int httpCode = http.POST(payload);
  bool success = false;

  if (httpCode > 0) {
    String response = http.getString();
    Serial.printf("[HTTP %d] Response: %s\n", httpCode, response.c_str());
    if (httpCode == 200 || httpCode == 201) {
      success = true;
    }
  } else {
    Serial.printf("[HTTP ERROR] Failed: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
  return success;
}

// ==========================================
// 9. HELPER: OPTIONAL GPS TELEMETRY
// ==========================================
void sendGpsTelemetryIfAvailable() {
  if (!gps.location.isValid()) return;
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = "http://" + String(BACKEND_HOST) + ":" + String(BACKEND_PORT) + "/api/v1/telemetry/ambulance";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(2500);

  String payload = "{\"vehicle_id\":\"" + String(AMBULANCE_ID) + "\","
                   "\"latitude\":" + String(gps.location.lat(), 6) + ","
                   "\"longitude\":" + String(gps.location.lng(), 6) + ","
                   "\"speed\":" + String(gps.speed.kmph(), 1) + ","
                   "\"timestamp\":0,"
                   "\"emergency_status\":\"" + String(emergencyActiveLocal ? "ACTIVE_CRITICAL" : "IDLE") + "\"}";

  int code = http.POST(payload);
  if (code == 200) {
    Serial.printf("[GPS TELEMETRY] Sent: Lat %.5f, Lon %.5f, Speed %.1f km/h\n",
                  gps.location.lat(), gps.location.lng(), gps.speed.kmph());
  }
  http.end();
}
