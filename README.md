# Advantech LoRa Payload Formatter v0.71

A web-based tool for manipulating Advantech LoRaWAN payloads. This application provides three main functions:
1.  **Uplink Parser**: Decodes raw hexadecimal uplink payloads into human-readable JSON.
2.  **Downlink Analysis**: Constructs downlink commands and decodes downlink payloads.
3.  **MAC Analysis**: Analyzes, Generates, and Decodes LoRaWAN MAC Commands (v1.0.4).

## Features

### Uplink Parser (Official Integration)
-   Integrates the official `PayloadPaser_TTN.js` supplied by Advantech.
-   Supports standard sensor data, I/O status, and device configuration payloads.
-   Provides formatted JSON output with syntax highlighting.

### Downlink Analysis
-   **Generator**: Strict adherence to v1.36 specification with smart inputs and protocol visualization.
-   **Decoder**: Parses hex strings back into readable command structures with parameter breakdown.
-   **Smart UI**: Auto-hides irrelevant fields, validates inputs, and supports Hex/Dec toggling.

### MAC Analysis (New!)
-   **Generator**: Create MAC Commands (e.g., LinkCheck, LinkADR) with easy-to-use forms.
    -   Features rich UI for complex parameters like `LinkADRReq` (Channel Mask selection grid).
-   **Decoder**: Parse MAC command streams (Uplink/Downlink context aware).
-   **Version Support**: Based on LoRaWAN 1.0.4 specification.


## Docs and Links
-   Original project: https://github.com/jim6501/Advantech-LoRa-Payload-Generator
-   Project demo: https://jim6501.github.io/Advantech-LoRa-Payload-Generator/


## Usage

1.  Open 'index.html' in any modern browser or follow the 'Project demo' link to access the Web Tool Page.
2.  **Uplink Parsing**: Paste hex payload into **Uplink Parser** and click Parse.
3.  **Downlink Analysis**: Use **Generator** to create commands or **Decoder** to read them.
4.  **MAC Analysis**: Generate or Decode LoRaWAN MAC commands (LinkADR, DutyCycle, etc.) with the dedicated tool.

## File Structure

-   `index.html`: Main application entry point.
-   `css/style.css`: Custom dark-mode styling and layout.
-   `js/main.js`: Core application logic, event handling, and UI rendering.
-   `js/generator.js`: Downlink logic, command definitions, and checksum calculation.
-   `js/decoder.js`: Downlink decoding logic.
-   `js/mac_cmd.js`: MAC Command definitions, generation, and parsing logic.
-   `js/parser.js`: Official uplink parsing logic (Vendor supplied).

## Recent Updates (v0.71)

-   **[UI]** **Standardized Output UI**:
    -   Unified "Output Result" styling across Uplink Parser, Downlink Decoder, and MAC Decoder.
    -   Consistent placeholder text ("Enter Hex string and click Parse/Decode...") and edge-to-edge dark styling with padding.
    -   Aligned MAC Decoder output height with Downlink Decoder.
-   **[Feature]** **Smart Paste**:
    -   Added Paste buttons (<i class="fa-regular fa-paste"></i>) to all input fields (Uplink, Downlink Decoder, MAC Decoder).
    -   Added clear feedback (Toast notifications) for Paste and Copy actions.

## Previous Updates (v0.7)

-   **[Feature]** Added **MAC Command Analysis** tab.
    -   Includes Generator and Decoder for LoRaWAN 1.0.4 MAC Commands.
    -   Key commands supported: LinkCheck, LinkADR, DutyCycle, RXParamSetup, DevStatus, etc.
-   **[Enhancement]** Rich UI for **LinkADR Request**:
    -   Visual 16-channel selection grid.
    -   Context-aware `ChMaskCntl` dropdown (Region selection).
-   **[Enhancement]** **MAC Decoder**:
    -   Parses concatenated MAC command streams.
    -   Handles Uplink/Downlink context differences (e.g., LinkCheck Ans vs Req).

## Previous Updates (v0.6)

-   **[Feature]** Added **Downlink Decoder**: Parse hex strings back into readable commands.

## Previous Updates (v0.5)
-   **[Feature]** Added "Hex/Dec" toggle for all numeric inputs.
-   **[Enhancement]** Implemented strict input validation with "Max Value" warnings.
-   **[Enhancement]** Fixed "Sensor (0x5)" inputs: Channel/Mask locked to 0 where applicable.
-   **[Enhancement]** Optimized Protocol Structure display to match official documentation style.
-   **[Enhancement]** Repositioned **Copy Button** to the right of the generated hex string for better accessibility.
-   **[Fix]** Corrected bit-order for Accelerometer Axis Mask (Z=Bit7, Y=Bit6, X=Bit5).
-   **[Fix]** Restored ability to select specific Axes for Accelerometer commands.

