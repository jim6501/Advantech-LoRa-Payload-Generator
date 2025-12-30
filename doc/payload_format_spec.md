# IIoT WISE LPWAN Payload Format Specification (v1.36)

此規格書整理自 **Advantech IIoT WISE LPWAN Payload Format Spec_v1.36** 文件，包含 Uplink (Decoder) 與 Downlink (Command Generator) 的詳細定義。

## 1. 全域定義 (Global Definitions)

* **字節序 (Endianness):** Little-Endian (LSB First)。
* **數值編碼:** 若未特別標註，數值皆為 Unsigned Integer。
* **LoRaWAN Frame 結構:** `WHDR (1 Byte)` + `WPayload (N Bytes)` + `WCRC (1 Byte, Optional)`。

### WCRC 規格 (Checksum Specification)
封包末尾的校驗碼 (若存在)。
* **演算法:** CRC-8-CCITT
* **多項式 (Polynomial):** `0x07` ($x^8 + x^2 + x + 1$)
* **初始值 (Initial Value):** `0xFF`
* **計算範圍:** 僅針對 **WPayload** 區段進行計算 (不包含 WHDR)。

---

## 2. WHDR Header (標頭)

所有封包的 **Byte 0**。

| Bit | 名稱 | 定義 |
| :--- | :--- | :--- |
| **7** | First Segment | `1`: 封包起始 (後續包含 Sequence, Total Length) <br> `0`: 非起始分段 |
| **6** | Encrypted | `1`: AES-256 加密 <br> `0`: 無加密 |
| **5** | FC II Exist | `1`: Frame Control II 存在 <br> `0`: 不存在 |
| **4** | RFU | 保留 (0) |
| **3-2** | Address Mode | `00`: 無來源地址 <br> `01`: 2 Bytes DevEUI (LSB) <br> `10`: 8 Bytes DevEUI |
| **1-0** | Frame Version | `00`: 初始版本 <br> `01`: **標準版本** <br> `10`: 應用原始數據版 (用於大數據) |

---

# Part 1: Uplink Payload Decoder (接收資料解析)

解析時讀取每個 Block 的第 0 Byte (High Nibble) 判斷 **I/O Type**。

### Type 0x0: DI Data (數位輸入)

| Byte | Bit | 欄位 | 說明 |
| :--- | :--- | :--- | :--- |
| **0** | 7-4 | **Type** | **0x0** |
| **0** | 3-0 | Mode | `0`: DI, `1`: Counter, `2`: L2H Latch, `3`: H2L Latch, `4`: Frequency |
| **1** | 7-0 | Len | 後續資料長度 |
| **2** | 7-5 | Index | 通道 (0~7) |
| **2** | 4-0 | Mask | **B0**: Status, **B1**: Value, **B2**: Event |
| *Var* | - | Status | *(Mask B0)* 1 Byte. Bit 0: Level, Bit 1: Counting, Bit 2: Overflow, Bit 4: L2H Latch |
| *Var* | - | Value | *(Mask B1)* 4 Bytes (UInt32). Counter 或 Frequency 值 |
| *Var* | - | Event | *(Mask B2)* 1 Byte. Bit 0: DI Not Ready |

### Type 0x1: DO Data (數位輸出)

| Byte | Bit | 欄位 | 說明 |
| :--- | :--- | :--- | :--- |
| **0** | 7-4 | **Type** | **0x1** |
| **0** | 3-0 | Mode | `0`: DO, `1`: Pulse Output, `2`: Low to High delay, `3`: High to Low delay |
| **1** | 7-0 | Len | 後續資料長度 |
| **2** | 7-5 | Index | 通道 (0~7) |
| **2** | 4-0 | Mask | **B0**: Status, **B1**: Abs Pulse, **B2**: Inc Pulse |
| *Var* | - | Status | *(Mask B0)* 1 Byte. Bit 0: Level, Bit 1: Continuous, Bit 2: Stop |
| *Var* | - | Abs Val | *(Mask B1)* 4 Bytes (UInt32). Absolute Pulse Value |
| *Var* | - | Inc Val | *(Mask B2)* 4 Bytes (UInt32). Incremental Pulse Value |

### Type 0x3: AI Data (類比輸入)

| Byte | Bit | 欄位 | 說明 |
| :--- | :--- | :--- | :--- |
| **0** | 7-4 | **Type** | **0x3** |
| **0** | 3-0 | Range | `0`~`12`: 一般範圍, `15`: 由 Mask2 指定 |
| **1** | 7-0 | Len | 後續資料長度 |
| **2** | 7-5 | Index | 通道 (0~7) |
| **2** | 4-0 | Mask | **B0**: Status, **B1**: Raw, **B2**: Event, **B3**: Max, **B4**: Min, **B7**: Mask2 |
| *Var* | - | Status | *(Mask B0)* 1 Byte. Bit 0: Low Alarm, Bit 1: High Alarm |
| *Var* | - | Raw | *(Mask B1)* 2 Bytes (UInt16) |
| *Var* | - | Event | *(Mask B2)* **2 Bytes**.<br>Bit 0: Fail (Timeout/ADC Error)<br>Bit 1: Over Range<br>Bit 2: Under Range<br>Bit 3: Open Circuit (Burnout)<br>Bit 4: AI Not Ready<br>Bit 5: Unavailable Channel<br>Bit 6: ADC Init/Error<br>Bit 8: Zero/Span Cal Error |
| *Var* | - | Max Val | *(Mask B3)* 2 Bytes (UInt16) |
| *Var* | - | Min Val | *(Mask B4)* 2 Bytes (UInt16) |
| *Var* | - | Mask 2 | *(Mask B7)* 1 Byte. Bit 0: Range2, Bit 1: Scaling |
| *Var* | - | Range 2 | *(Mask2 B0)* 1 Byte. `15`: PT100(385), `16`: PT100(392), `17`: PT1000 |
| *Var* | - | Scaling | *(Mask2 B1)* 4 Bytes (Signed Int). 物理值 * 1000 |

### Type 0x5: Sensor Data (Temp/Hum/Accel)

| Byte | Bit | 欄位 | 說明 |
| :--- | :--- | :--- | :--- |
| **0** | 7-4 | **Type** | **0x5** |
| **0** | 3-0 | Range | `0`: Temp(C), `1`: Temp(F), `3`: Hum, `4`: Accel(g), `5`: Accel(m/s²) |
| **1** | 7-0 | Len | 後續資料長度 |
| **2** | 7-5 | Index | **Temp**: Channel Index.<br>**Accel**: Axis Mask (Bit 0: X, Bit 1: Y, Bit 2: Z). |
| **2** | 4-0 | Mask | **Temp**: Bit 0(Status), 1(Event), 2(Value), 3(Max), 4(Min).<br>**Accel**: **Bit 0** 決定下一個 Byte (Byte 3) 的格式。 |

#### 加速規 Extend Mask 定義 (Accel Range 0x4/0x5)

若 **Byte 2 Bit 0 = 0 (General Format)**，則 Byte 3 為 **Extend Mask A**，定義包含哪些特徵值：

| Extend Mask A (Byte 3) | 說明 (數值皆為 2 Bytes) |
| :--- | :--- |
| **Bit 0** | Velocity (速度 RMS) |
| **Bit 1** | Peak Acceleration (峰值加速度) |
| **Bit 2** | RMS Acceleration (均方根加速度) |
| **Bit 3** | Kurtosis (峰度) |
| **Bit 4** | Crest Factor (波峰因數) |
| **Bit 5** | Skewness (偏度) |
| **Bit 6** | Standard Deviation (標準差) |
| **Bit 7** | Displacement (位移) |

* **資料順序:** 依序輸出 Axis Mask 中致能的軸 (X -> Y -> Z)。
* **每個軸的結構:** `Sensor Event (2 Bytes)` + `Extend Mask A 指定的特徵值 (每項 2 Bytes)`。

若 **Byte 2 Bit 0 = 1 (Massive Data Format)**，則 Byte 3 為 **Massive Info**，且 Payload 為 FFT/Raw Data：

| Massive Info (Byte 3) | 說明 |
| :--- | :--- |
| **Bit 1-0** | 資料類型 (`01`: FFT, `10`: Raw Data) |
| **Bit 3-2** | Samples 設定 |
| **Bit 4** | Bytes per sample (`0`: 2 Bytes, `1`: 4 Bytes) |

* **Massive Data 結構:** `Massive Info(1B)` + `Sample Rate(3B)` + `Points(2B)` + `Log Index(4B)` + `Timestamp(4B)` + `Total Len(4B)` + `Offset(4B)` + `Data(N Bytes)`.

---

### Type 0x6: Device Data (設備資訊)

| Byte | Bit | 欄位 | 說明 |
| :--- | :--- | :--- | :--- |
| **0** | 7-4 | **Type** | **0x6** |
| **1** | 7-0 | Len | 長度 |
| **2** | 7-0 | Mask 1 | **B0**: Event, **B1**: Pwr, **B2**: Batt%, **B3**: BattV, **B4**: Time, **B5**: Pos, **B6**: RSSI, **B7**: Mask2 |
| *Var* | - | Event | *(Mask B0)* 1 Byte. B0: Batt Low, B1: RTC Low, B3: Sensor Err |
| *Var* | - | Pwr Src | *(Mask B1)* 1 Byte. 0: Line, 1: Battery, 2: Solar |
| *Var* | - | Timestamp| *(Mask B4)* 4 Bytes (UInt32) |
| *Var* | - | Position | *(Mask B5)* 7 Bytes. `Null|NS|EW` + `Lat(3B)` + `Lon(3B)`. Formula: `(Deg + Min/60)*10^5` |
| *Var* | - | Mask 2 | *(Mask B7)* **B0**: FW Version (Length + String) |

### Type 0x7 (Coil) / 0x8 (Register)

| Byte | Bit | 欄位 | 說明 |
| :--- | :--- | :--- | :--- |
| **0** | 7-4 | **Type** | **0x7** (Coil) 或 **0x8** (Register) |
| **0** | 3-0 | Mask | B0: Status, B1: Value, B2: Multiple Channels |
| **1** | 7-0 | Len | 長度 |
| **2** | 7 | Port | 0: COM1, 1: COM2 |
| **2** | 6-0 | Index | Modbus Rule Index |
| *Var* | - | Status | 1 Byte. Modbus 通訊狀態 (見下表) |
| *Var* | - | Value | Coil: 1 Byte. Register: 2 Bytes |

#### Modbus Status 狀態碼表

| 數值 (Hex) | 說明 (Description) |
| :--- | :--- |
| `0x00` | No Error (正常) |
| `0x01` | Illegal Function |
| `0x02` | Illegal Data Address |
| `0x03` | Illegal Data Value |
| `0x04` | Slave Device Failure |
| `0x05` | Acknowledge |
| `0x06` | Slave Device Busy |
| `0x07` | Negative Acknowledge |
| `0x08` | Memory Parity Error |
| `0x0A` | Gateway Path Unavailable |
| `0x0B` | Gateway Target Device Failed to Respond |
| `0x10` | Unavailable |
| `0x11` | Slave Response Timeout (逾時) |
| `0x12` | Checksum Error |
| `0x13` | Received Data Error |
| `0x14` | Send Request Fail |
| `0x15` | Unprocessed |
| `0x16` | Read Only |
| `0x17` | In Processing |

### Type 0xF: Response Message (下行回應)

| Byte | Bit | 欄位 | 說明 |
| :--- | :--- | :--- | :--- |
| **0** | 7-4 | **Type** | **0xF** |
| **1** | 7-0 | Len | 長度 |
| **2** | 7-4 | DL Type | 原始下行指令的 IO Type (如 0x6) |
| **3** | - | DL Index | 原始下行指令的 Data Index |
| **4** | 7 | Result | `0`: Success, `1`: Fail |
| **4** | 6-0 | Reason | `0x00`: No Error, `0x01`: Timeout, `0x04`: Not Supported |

---

# Part 2: Downlink Command Generator (下行指令編碼)

指令結構統一為： `Header (1 Byte) | Len (1 Byte) | Data Index (1 Byte) | Parameters (N Bytes)`。

## 1. DI Configuration (Type 0x0)
**Header:** `0x0` (Type) + `CH Index` (0~15)

| Data Index | Length | 功能 (Function) | 參數 (Data Content) |
| :--- | :--- | :--- | :--- |
| **1** | 1 | Start Counter | `1`: Start, `0`: Stop |
| **2** | 1 | Clear Overflow | 寫入 `0` |
| **3** | 1 | Clear Counter | 寫入 `1` |
| **4** | 1 | Clear L2H Latch | 寫入 `0` |
| **5** | 1 | Clear H2L Latch | 寫入 `0` |
| **6** | 4 | Config Interval | 單位: 秒 (1~86400, UInt32) |

## 2. DO Control (Type 0x1)
**Header:** `0x1` (Type) + `CH Index` (0~15)

| Data Index | Length | 功能 (Function) | 參數 (Data Content) |
| :--- | :--- | :--- | :--- |
| **1** | 1 | Set Output | `1`: High, `0`: Low |
| **2** | 1 | Pulse Continuous | `1`: Continuous, `0`: Disable |
| **3** | 1 | Stop Pulse | 寫入 `1` 停止 |

## 3. AI Configuration (Type 0x3)
**Header:** `0x3` (Type) + `CH Index` (0~15)

| Data Index | Length | 功能 (Function) | 參數 (Data Content) |
| :--- | :--- | :--- | :--- |
| **1** | 1 | Clear High Alarm | 寫入 `0` |
| **2** | 1 | Clear Low Alarm | 寫入 `0` |
| **3** | 1 | Clear Max Val | 寫入 `1` |
| **4** | 1 | Clear Min Val | 寫入 `1` |
| **5** | 4 | Config Interval | 單位: 秒 (UInt32) |

## 4. Sensor Configuration (Type 0x5)
**Header:** `0x5` (Type) + `Range` (0: Temp, 4: Accel)
**Byte 2 (Acc Only):** `Axis Mask` (Bit 7-5) + `Reserved` (BIT7-BIT5順序為Z,Y,X)

### Range 0: Temperature / Humidity
| Data Index | Length | 功能 (Function) | 參數 (Data Content) |
| :--- | :--- | :--- | :--- |
| **1** | 1 | Clear High Alarm | 寫入 `0` |
| **2** | 1 | Clear Low Alarm | 寫入 `0` |
| **3** | 1 | Clear Max Val | 寫入 `1` |
| **4** | 1 | Clear Min Val | 寫入 `1` |
| **5** | 4 | Set High Limit | Float 數值 |
| **6** | 4 | Set Low Limit | Float 數值 |
| **7** | 4 | Set Offset | Float 數值 |

### Range 4: Accelerometer
| Data Index | Length | 功能 (Function) | 參數 (Data Content) |
| :--- | :--- | :--- | :--- |
| **1** | 1 | Clear Vel. RMS Alarm | 寫入 `0` |
| **5** | 4 | Set Vel. RMS Limit | 單位 0.01 mm/s (UInt32) |
| **9** | 4 | Get Log Massive Data | Log Index (0xFFFFFFFF = Latest) |
| **10** | 8 | Read N Bytes from Log | `Log Index(4)` + `N(2)` + `K(2)` |
| **11** | 8 | Get Log at UTC | `Log Index(4)` + `UTC Time(4)` |
| **12** | 2 | Enable Feature Data | Bit 4: Displacement (1=Enable) Bit 3: Standard Deviation (1=Enable) Bit 2: Skewness (1=Enable) Bit 1: Crest 
Factor (1=Enable) Bit 0: Kurtosis (1=Enable) |
| **14** | 0 | Reserved | 無參數 (Specific triggering command) |
| **15** | 5 | Get Feature Data | `Log Index(4)` + `Send Temp(1)` |
| **16** | 0 | Reserved | 無參數 |

## 5. Device Configuration (Type 0x6)
**Header:** `0x6` (Type) + `Config Type`
**Config Type 定義:** 判讀 Bit 3-1 (1: General, 2: App, 3: Network)，**Bit 0 Reserved (0)**。

### Config Type 1 (General)
| Data Index | Length | 功能 (Function) | 參數 (Data Content) |
| :--- | :--- | :--- | :--- |
| **1** | 4 | Adjust RTC | UTC Timestamp (UInt32) |
| **2** | Var | Adjust RTC (ISO) | String Format: `YYYY-MM-DDThh:mm:ssTZD` (e.g., "2023-01-01T12:00:00+08:00") |
| **3** | 3 | Restart System | String "RST" |
| **4** | 4 | Adjust RTC Offset | 秒數 (Signed Int32) |
| **5** | 1 | Query FW Version | 寫入 `0x00` |

### Config Type 2 (Application)
| Data Index | Length | 功能 (Function) | 參數 (Data Content) |
| :--- | :--- | :--- | :--- |
| **1** | 4 | Update Interval | 單位: 秒 (1~2592000) |
| **2** | 10 | Schedule | Mode(1), Weekday(1), StartTime(2), EndTime(2), Interval(4) |

### Config Type 3 (Network)
| Data Index | Length | 功能 (Function) | 參數 (Data Content) |
| :--- | :--- | :--- | :--- |
| **1** | 1 | Device Class | `0x01`: Class A, `0x03`: Class C |
| **2** | 1 | Message ACK | `0`: Disable, `1`: Enable |
| **3** | 1 | Retry Counts | Retry 次數 |

## 6. RS-485 Modbus Control (Type 0x7/0x8)
**Header:** `0x7` (Coil) 或 `0x8` (Register)
**Channel Byte:**
* **Bit 7:** Port (`0` = COM 1, `1` = COM 2)
* **Bit 6-0:** Rule Index

| Data Index | Length | 功能 (Function) | 參數 (Data Content) |
| :--- | :--- | :--- | :--- |
| **1** | 1/2 | Set Value | **Coil (0x7):** 1 Byte (`0` or `1`) <br> **Register (0x8):** 2 Bytes (UInt16) |
| **0x80** | 8 | Scan Interval | `Rule Mask(4)` + `Interval(4)` |

