# StrideSync

Your personal running cadence coach.

## Live Demo

You can try the live application here: [https://stride-sync-six.vercel.app/](https://stride-sync-six.vercel.app/)

## Features

StrideSync is a Progressive Web App (PWA) designed to help runners improve their cadence (steps per minute). It uses your device's motion sensors to provide real-time feedback and guidance.

-   **Real-Time Cadence Tracking:** Uses your phone's accelerometer to detect your steps and display your live cadence in Steps Per Minute (SPM).
-   **Configurable Cadence Zones:** Set your own minimum and maximum target cadence to define your ideal running zone.
-   **Color-Coded Visual Feedback:** The SPM display changes color to give you instant feedback:
    -   **Blue:** Cadence is below your target zone.
    -   **Green:** You're right on target!
    -   **Red:** Cadence is above your target zone.
-   **Auditory Feedback (Metronome):** A smart metronome provides distinct sounds to guide you without looking at the screen:
    -   A low, drum-like beat if you're below the zone.
    -   A neutral click when you're inside the zone.
    -   A high-pitched tone if you're above the zone.
-   **Training Modes:**
    -   **Static Mode:** Maintain your cadence within a fixed range.
    -   **Dynamic Mode:** The app guides you through intervals, automatically adjusting the target cadence up and down.
-   **Voice Announcements:** Get periodic voice updates on your average cadence during your run (interval is configurable).
-   **Session Summary:** After each run, review a detailed summary including total duration, total steps, average cadence, and a chart analyzing your performance against the target.
-   **PWA & Mobile Ready:** Install StrideSync on your phone's home screen for an app-like experience. It also uses Wake Lock to prevent your screen from turning off mid-run.
-   **Settings Persistence:** Your custom configuration is automatically saved on your device for your next session.
-   **Built-in Presets:** Get started quickly with presets like "Steady Run," "Intervals," and more.
