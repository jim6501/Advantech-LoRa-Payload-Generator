# Advantech LoRa Payload Generator (Beta Test v0.45)

A web-based tool for manipulating Advantech LoRaWAN payloads. This application provides two main functions:
1.  **Uplink Parser**: Decodes raw hexadecimal uplink payloads into human-readable JSON.
2.  **Downlink Generator**: Constructs hexadecimal downlink commands based on user inputs and the v1.36 specification.

## Features

### Uplink Parser (Official Integration)
-   Integrates the official `PayloadPaser_TTN.js` supplied by Advantech.
-   Supports standard sensor data, I/O status, and device configuration payloads.
-   Provides formatted JSON output with syntax highlighting.

### Downlink Generator (Enhanced)
-   **Strict Specification Adherence**: Supports Data I/O (DI/DO), Analog I/O (AI), Sensor Config, and Device Config.
-   **Smart Inputs**:
    -   **Hex/Decimal Toggle**: Numeric inputs allow values in either decimal or hexadecimal (with auto-conversion).
    -   **Input Validation**: Checks against defined maximum values and displays inline warnings (e.g., "Max: 2592000").
    -   **Dynamic UI**: Auto-hides irrelevant fields (e.g., "Channel" input hidden for Device type 0x6).
-   **Advanced Visualization**:
    -   **Protocol Structure**: Breaks down generated hex into color-coded segments: Header (Gold), Type/Mask (Blue), Data (Green), etc.
    -   **Mask Calculation**: Automatically calculates complex bitmasks for Accelerometer Axes (Z/Y/X mapping).
-   **Feature Support**: Expanded options for "Enable Features" including Kurtosis, Skewness, and Crest Factor.

## Usage

1.  Open `index.html` in any modern web browser.
2.  **Uplink Parsing**:
    -   Copy your LoRaWAN Hex Payload.
    -   Paste it into the "Input Hex String" box in the **Uplink Parser** tab.
    -   Click "Parse" to view the decoded JSON.
3.  **Downlink Generation**:
    -   Switch to the **Downlink Gen** tab.
    -   Select **Category**, **Sensor Range**, and **Command**.
    -   Fill in the required parameters (Inputs adjust dynamically).
        -   *Tip*: Use the dropdown next to number fields to switch between Dec/Hex input modes.
    -   Click "Generate Hex".
    -   Copy the result from the "Generated Hex String" box.

## File Structure

-   `index.html`: Main application entry point.
-   `css/style.css`: Custom dark-mode styling and layout.
-   `js/main.js`: Core application logic, event handling, and UI rendering.
-   `js/generator.js`: Downlink logic, command definitions, and checksum calculation.
-   `js/parser.js`: Official uplink parsing logic (Vendor supplied).

## Recent Updates (v0.45 Beta)

-   **[Feature]** Added "Hex/Dec" toggle for all numeric inputs.
-   **[Enhancement]** Implemented strict input validation with "Max Value" warnings.
-   **[Enhancement]** Fixed "Sensor (0x5)" inputs: Channel/Mask locked to 0 where applicable.
-   **[Enhancement]** Optimized Protocol Structure display to match official documentation style.
-   **[Fix]** Corrected bit-order for Accelerometer Axis Mask (Z=Bit7, Y=Bit6, X=Bit5).
