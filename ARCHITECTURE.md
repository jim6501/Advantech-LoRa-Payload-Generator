# Software Architecture Design

This document outlines the software architecture of the Advantech LoRa Payload Generator. The project is designed as a client-side Single Page Application (SPA) that processes data locally without server-side dependencies.

## 1. High-Level Overview

The application is split into two distinct functional modules:
**A. Uplink Parser**: Decodes raw hexadecimal payloads from LoRa nodes into human-readable JSON.
**B. Downlink Generator**: coding user inputs into hexadecimal command strings for device configuration.

**Core Philosophy**:
-   **Client-Side Execution**: All logic runs in the browser.
-   **Separation of Concerns**: UI (Presentation) is separated from Logic (Parser/Generator).
-   **Official Integration**: The uplink parser directly integrates the vendor-supplied decoding logic (`PayloadPaser_TTN.js`).

## 2. File Structure & Responsibilities

```text
/
├── index.html          # Application Shell (UI)
├── css/
│   └── style.css       # Custom Styling (Dark Mode, Layouts)
├── js/
│   ├── main.js         # UI Controller (Event handling, DOM manipulation)
│   ├── parser.js       # Business Logic: Uplink Decoding (Vendor Code)
│   └── generator.js    # Business Logic: Downlink Command Construction
├── doc/
│   └── ...             # Reference Specifications
└── README.md           # User Documentation
```

### Module Details

#### 1. `index.html` (View)
-   **Role**: Defines the visual structure.
-   **Key Components**:
    -   **Tabs**: Switches between Uplink and Downlink views.
    -   **Uplink Section**: Input text area and JSON output pre-block.
    -   **Downlink Section**: Dynamic form generation container and Output display.
-   **Libraries**:
    -   Bootstrap 5 (Layout & Components)
    -   FontAwesome (Icons)

#### 2. `js/main.js` (Controller)
-   **Role**: Bridges the user interface and the business logic.
-   **Key Functions**:
    -   `runParser()`: Reads input, calls `parser.js`, and renders results.
    -   `updateGenCommands()`: Dynamically populates dropdowns based on `generator.js` definitions.
    -   `updateGenParams()`: Renders form inputs (Number, Select, Bitmask, Composite) based on command metadata.
    -   `runGenerator()`: Collects form data, calls `generator.js`, and styles the output.
    -   `validateInput()`: Real-time input validation (Max values, Hex format).

#### 3. `js/parser.js` (Business Logic - Uplink)
-   **Role**: Pure logic for decoding LoRa payloads.
-   **Key Features**:
    -   `decodeUplink(input)`: Main entry point.
    -   Contains bitwise operations to extract Sensor Data, I/O Status, and Device Events.
    -   *Note*: This file is largely vendor-supplied code wrapped for browser usage.

#### 4. `js/generator.js` (Business Logic - Downlink)
-   **Role**: Defines command structures and generates hex payloads.
-   **Architecture**:
    -   `DownlinkGenerator.DEFS`: A static configuration object defining all possible commands, their parameters, types, and limits.
    -   `DownlinkGenerator.generate(params)`: functional core.
        -   Constructs the 3-byte Header (WHDR, SEQ, LEN).
        -   Computes Command Payload (Type, Mask, Data).
        -   Calculates CRC-8 checksum.
        -   Returns structured data (Hex + Protocol Breakdown).

#### 5. `css/style.css` (Presentation)
-   **Role**: Overrides Bootstrap defaults for a custom "Dark Technical" aesthetic.
-   **Key Styles**:
    -   Custom color palette (Dark backgrounds, vibrant accents).
    -   `struct-badge`: Classes for color-coding the protocol breakdown.

## 3. Data Flow

### Uplink Flow
1.  **User Input**: Pastes Hex String in Browser.
2.  **Controller (`main.js`)**: Captures string, sanitizes input.
3.  **Logic (`parser.js`)**: Iterates through bytes, applies masks, extracts values.
4.  **Output**: Returns a Javascript Object.
5.  **View**: `main.js` syntax-highlights the JSON and updates DOM.

### Downlink Flow
1.  **User Selection**: Chooses Category -> Range -> Command.
2.  **Dynamic Rendering**:
    -   `main.js` reads `DownlinkGenerator.DEFS[Type][Cmd]`.
    -   Renders HTML inputs (e.g., `<input type="number">` or Bitmask Checkboxes).
3.  **Generation**:
    -   User clicks "Generate".
    -   `main.js` builds a `params` object from DOM values.
    -   `DownlinkGenerator.generate()` processes `params`.
        -   Byte packing based on `doc/payload_format_spec.md`.
        -   Bitmask construction (e.g., Accel Axis Mask).
4.  **Visualization**:
    -   Generator returns object `{ hex: "...", parts: { ... } }`.
    -   `main.js` renders the raw hex and the color-coded Protocol Breakdown.

## 4. Design Patterns & Principles

-   **Data-Driven UI**: The Downlink Generator UI is built dynamically from the `DEFS` configuration object. Adding a new command only requires updating the configuration in `generator.js`, not HTML code.
-   **Module Pattern**: Logic files are self-contained namespaces (e.g., `DownlinkGenerator` object) scope pollution.
-   **Defensive Programming**: Functions like `validateInput` and try-catch blocks in `runGenerator` ensure the app doesn't crash on invalid data.

## 5. Visual Architecture Diagram

```mermaid
graph TD
    subgraph "Presentation Layer (View)"
        HTML[index.html]
        CSS[css/style.css]
    end

    subgraph "Controller Layer"
        MainJS[js/main.js<br/>(UI Controller)]
    end

    subgraph "Business Logic Layer (Model)"
        ParserJS[js/parser.js<br/>(Uplink Decoder)]
        GenJS[js/generator.js<br/>(Downlink Generator)]
    end

    %% Styles
    style HTML fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style CSS fill:#e3f2fd,stroke:#1565c0
    style MainJS fill:#fff3e0,stroke:#ff9800,stroke-width:2px
    style ParserJS fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style GenJS fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px

    %% Relationships
    HTML -->|Loads| CSS
    HTML -->|Loads| MainJS
    HTML -->|Loads| ParserJS
    HTML -->|Loads| GenJS

    MainJS -->|Reads DOM| HTML
    MainJS -->|Updates DOM| HTML

    MainJS -->|Calls| ParserJS
    MainJS -->|Calls| GenJS

    ParserJS -.->|Returns JSON| MainJS
    GenJS -.->|Returns Hex & Structure| MainJS

    %% User Interaction
    User((User)) -->|Interacts| HTML
```
