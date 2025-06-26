# StrideSync: Functional Specification

StrideSync is a Progressive Web App (PWA) designed to act as a personal running cadence coach. It leverages a device's motion sensors to provide real-time auditory and visual feedback, helping runners maintain or improve their steps per minute (SPM).

## Core Features

### 1. Real-Time Cadence Tracking
- **Functionality:** Uses the device's accelerometer to detect steps in real-time.
- **Display:** Shows the current cadence, measured in Steps Per Minute (SPM), on the main screen.

### 2. Configurable Cadence Zones
- **Functionality:** Users can define their ideal running zone by setting a `minimum` and `maximum` target cadence.
- **Visual Feedback:** The SPM display and a progress bar change color instantly to reflect performance against the configured zone:
  - **Blue:** Cadence is below the minimum target.
  - **Green:** Cadence is within the target range.
  - **Red:** Cadence is above the maximum target.

### 3. Auditory Feedback (Smart Metronome)
- **Functionality:** A metronome provides distinct sounds to guide the user without needing to look at the screen. The sound type changes based on whether the runner is below, within, or above their target zone.
- **Sound Types:**
  - **Below Zone:** A low, drum-like beat to signal the need to speed up.
  - **In Zone:** A neutral, sharp click to confirm the pace is correct.
  - **Above Zone:** A high-pitched tone to signal the need to slow down.
- **Beat Frequency:** The user can configure the metronome to play a beat for every **step** or for every full leg **cycle** (i.e., every two steps).

### 4. Training Modes
- **Static Mode:** The user works to maintain their cadence within a fixed range (e.g., 170-180 SPM) for the entire session.
- **Dynamic Mode (Intervals):** The app automatically guides the user through cadence intervals, adjusting the target SPM up and down over time. This mode is fully configurable:
  - **Hold Low Duration:** Time (in seconds) to maintain the low end of the cadence.
  - **Hold High Duration:** Time (in seconds) to maintain the high end of the cadence.
  - **Increase Rate & Interval:** Cadence increase (in SPM) and frequency (in seconds) for the ramp-up phase.
  - **Decrease Rate & Interval:** Cadence decrease (in SPM) and frequency (in seconds) for the ramp-down phase.

### 5. Voice Announcements
- **Functionality:** Provides periodic audio updates of the average cadence during a session.
- **Configuration:** The user can set the interval (in seconds) for these announcements. Setting it to `0` disables them.

### 6. Session Summary & Analysis
- **Functionality:** After stopping a run, the app displays a detailed summary of the session.
- **Metrics Included:**
  - Total Duration
  - Total Steps
  - Average Cadence (SPM)
  - Time-in-Zone Analysis: Percentage of the session spent below, in, and above the target zone.
  - **Performance Chart:** A line chart that visualizes the user's actual cadence versus the target cadence throughout the session.

### 7. Settings & Presets
- **Settings Persistence:** All user configurations (cadence range, mode, etc.) are automatically saved on the device's local storage for future sessions.
- **Built-in Presets:** The app includes pre-configured settings for common training types like "Steady Run," "Intervals," and "Warm-up" to help users get started quickly.

## Mobile & PWA Features

- **PWA (Progressive Web App):** The application can be "installed" on a phone's home screen, providing an experience similar to a native app.
- **Offline Capability:** A Service Worker caches the necessary files, allowing the app to launch and run without an internet connection.
- **Screen Wake Lock:** Actively prevents the device's screen from turning off automatically due to inactivity during a run.
  - **Limitation:** This cannot prevent the app from being suspended if the user manually locks the screen or switches to another app.
- **Permissions Handling:** The app requests access to the device's motion sensors and remembers the user's choice to avoid asking on every visit.
