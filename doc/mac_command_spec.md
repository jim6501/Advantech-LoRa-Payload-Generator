# LoRaWAN 1.0.4 MAC Command Specification

This document defines the MAC Commands used in LoRaWAN 1.0.4. MAC commands are transported in the Frame Payload (FRMPayload) of a Data Message when FPort is 0, or in the FOpts field of a Data Message when FPort is not 0.

## Command Overview

| CID | Command | transmitted by | Short Description |
| :--- | :--- | :--- | :--- |
| 0x01 | Reserved | - | Reserved |
| 0x02 | **LinkCheck** | End-Device & Gateway | Connectivity validation |
| 0x03 | **LinkADR** | Gateway & End-Device | Rate adaptation |
| 0x04 | **DutyCycle** | Gateway & End-Device | Transmit duty cycle control |
| 0x05 | **RXParamSetup** | Gateway & End-Device | Receive window parameters |
| 0x06 | **DevStatus** | Gateway & End-Device | End-device status (Battery/Margin) |
| 0x07 | **NewChannel** | Gateway & End-Device | Modify/Add channel definition |
| 0x08 | **RXTimingSetup** | Gateway & End-Device | RX window timing |
| 0x09 | **TXParamSetup** | Gateway & End-Device | Transmit parameters (EIRP/Dwell) |
| 0x0A | **DlChannel** | Gateway & End-Device | Downlink frequency modification |
| 0x0B | Reserved | - | Reserved |
| 0x0C | Reserved | - | Reserved |
| 0x0D | **DeviceTime** | End-Device & Gateway | Device time synchronization |
| 0x80+ | Proprietary | - | Proprietary Extensions |

---

## Command Definitions

### 0x02 LinkCheck
Used by an end-device to validate its connectivity to the network.

**LinkCheckReq** (Up)
*   **Payload**: Empty (0 bytes)

**LinkCheckAns** (Down)
*   **Payload**: 2 bytes
    *   **Margin** (1 byte): Demodulation margin in dB (Range: 0..254).
    *   **GwCnt** (1 byte): Number of gateways that received the request.

### 0x03 LinkADR
Requests the end-device to change data rate, transmit power, redundancy, or channel mask.

**LinkADRReq** (Down)
*   **Payload**: 4 bytes
    *   **DataRate_TXPower** (1 byte): [DR(7:4) | TXPower(3:0)]
    *   **ChMask** (2 bytes): Channel Mask (LSB).
        *   16-bit bitmask. Each bit (0/1) controls the state (OFF/ON) of a channel.
        *   Interpretation depends on `ChMaskCntl`.
    *   **Redundancy** (1 byte): [0(7) | ChMaskCntl(6:4) | NbTrans(3:0)]
        *   **ChMaskCntl** (3 bits): Controls the interpretation of `ChMask`.
            *   **Region A (Few Channels, e.g., EU868, AS923)**:
                *   `0`: ChMask controls Channels 0-15.
                *   `6`: Enable All Defined Channels (ChMask ignored).
            *   **Region B (Many Channels, e.g., US915, CN470)**:
                *   `0`: ChMask controls Channels 0-15.
                *   `1`: ChMask controls Channels 16-31.
                *   `2`: ChMask controls Channels 32-47.
                *   ...and so on.
                *   `6`: Enable All Defined Channels.
                *   `7`: Disable All Channels (in some regions) or RFC Reserved.

**LinkADRAns** (Up)
*   **Payload**: 1 byte
    *   **Status** (1 byte): 
        *   Bit 2: Channel Mask ACK
        *   Bit 1: Data Rate ACK
        *   Bit 0: Power ACK

### 0x04 DutyCycle
Limits the maximum aggregate transmit duty cycle.

**DutyCycleReq** (Down)
*   **Payload**: 1 byte
    *   **MaxDCParams** (1 byte): [0(7:4) | MaxDC(3:0)] (Aggregation = 1 / 2^MaxDC)

**DutyCycleAns** (Up)
*   **Payload**: Empty (0 bytes)

### 0x05 RXParamSetup
Configures the RX2 slot frequency and data rate, and the RX1 slot offset.

**RXParamSetupReq** (Down)
*   **Payload**: 4 bytes
    *   **DLSettings** (1 byte): [RX1DRoffset(6:4) | RX2DataRate(3:0)]
    *   **Frequency** (3 bytes): Frequency in Hz / 100 (LSB).

**RXParamSetupAns** (Up)
*   **Payload**: 1 byte
    *   **Status** (1 byte):
        *   Bit 2: RX2 Data Rate ACK
        *   Bit 1: RX1 DR Offset ACK
        *   Bit 0: Channel Frequency ACK

### 0x06 DevStatus
Requests the status of the end-device.

**DevStatusReq** (Down)
*   **Payload**: Empty (0 bytes)

**DevStatusAns** (Up)
*   **Payload**: 2 bytes
    *   **Battery** (1 byte): 0=Ext, 1=Min, 254=Max, 255=Unknown.
    *   **Margin** (1 byte): SNR of last received packet (-32..31) in lower 6 bits (signed).

### 0x07 NewChannel
Modifies the parameters of an existing channel or creates a new one.

**NewChannelReq** (Down)
*   **Payload**: 5 bytes
    *   **ChIndex** (1 byte): Channel Index.
    *   **Freq** (3 bytes): Frequency in Hz / 100.
    *   **DrRange** (1 byte): [MaxDR(7:4) | MinDR(3:0)]

**NewChannelAns** (Up)
*   **Payload**: 1 byte
    *   **Status** (1 byte):
        *   Bit 1: Data Rate Range ACK
        *   Bit 0: Channel Frequency ACK

### 0x08 RXTimingSetup
Sets the timing of the reception slots.

**RXTimingSetupReq** (Down)
*   **Payload**: 1 byte
    *   **Settings** (1 byte): [0(7:4) | Delay(3:0)] (Delays 1..15 seconds)

**RXTimingSetupAns** (Up)
*   **Payload**: Empty (0 bytes)

### 0x09 TXParamSetup
Configures the maximum allowed dwell time and Max EIRP.

**TXParamSetupReq** (Down)
*   **Payload**: 1 byte
    *   **EIRP_Dwell** (1 byte): [0(7:6) | DownlinkDwell(5) | UplinkDwell(4) | MaxEIRP(3:0)]

**TXParamSetupAns** (Up)
*   **Payload**: Empty (0 bytes)

### 0x0A DlChannel
Modifies the definition of a downlink RX1 slot frequency.

**DlChannelReq** (Down)
*   **Payload**: 4 bytes
    *   **ChIndex** (1 byte): Channel Index.
    *   **Freq** (3 bytes): Frequency in Hz / 100 (LSB).

**DlChannelAns** (Up)
*   **Payload**: 1 byte
    *   **Status** (1 byte):
        *   Bit 1: Uplink Frequency exists ACK
        *   Bit 0: Channel Frequency ACK

### 0x0D DeviceTime
Requests the current network time.

**DeviceTimeReq** (Up)
*   **Payload**: Empty (0 bytes)

**DeviceTimeAns** (Down)
*   **Payload**: 5 bytes
    *   **Seconds** (4 bytes): GPS Epoch seconds (uint32).
    *   **Fraction** (1 byte): Fractional second (1/256 steps).
