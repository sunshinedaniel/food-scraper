# Food Scraper

Dieses Projekt enthält Playwright-Skripte, um anstehende bestellte Mahlzeiten von verschiedenen Catering-Diensten zu scrapen.

## Unterstützte Dienste

- DLS (`dls-gmbh.biz`)
- GFB (`bestellung-gfb-catering.de`)

## Voraussetzungen

- [Node.js](https://nodejs.org/) (v16 oder neuer empfohlen)
- npm (wird normalerweise mit Node.js installiert)

## Einrichtung

1.  **Repository klonen:**
    ```bash
    git clone <repository-url>
    cd food-scraper
    ```

2.  **Abhängigkeiten installieren:**
    ```bash
    npm install
    ```

3.  **Playwright-Browser installieren:**
    ```bash
    npx playwright install
    ```

## Konfiguration

Der Scraper benötigt Anmeldeinformationen für die Catering-Dienste. Diese werden über Umgebungsvariablen verwaltet.

1.  Erstellen Sie eine `.env`-Datei im Stammverzeichnis des Projekts:
    ```bash
    touch .env
    ```

2.  Fügen Sie Ihre Anmeldeinformationen zur `.env`-Datei hinzu. Ersetzen Sie die Platzhalter durch Ihre tatsächlichen Daten.

    ```dotenv
    DLS_USERNAME="your_dls_username"
    DLS_PASSWORD="your_dls_password"
    GFB_USERNAME="your_gfb_username"
    GFB_PASSWORD="your_gfb_password"
    ```

## Ausführung

Um die Scraper zu starten, führen Sie die Playwright-Tests aus:

```bash
npx playwright test
```

## Ausgabe

Die Skripte erzeugen JSON-Dateien im `logs/`-Verzeichnis mit den gescrapten Bestelldaten.

- `logs/dls_ordered_meals.json`: Enthält bestellte Mahlzeiten von DLS.
- `logs/gfb_ordered_meals.json`: Enthält bestellte Mahlzeiten von GFB.

### Beispiel-Ausgabe (`dls_ordered_meals.json`)

```json
[
  {
    "date": "2023-10-26",
    "dish": "Hähnchen süß-sauer mit Reis"
  },
  {
    "date": "2023-10-27",
    "dish": "Fischfilet mit Kartoffelsalat"
  }
]
```

