# Boktok

Ett personligt bokbibliotek med ett svenskt, mobilanpassat gränssnitt.

## Kom igång

Använd Node.js 22.12 eller senare och npm.

```sh
npm ci
npm run dev
```

Öppna adressen som Vite visar. Inga miljövariabler eller externa konton behövs för den första versionen.

```sh
npm test
npm run lint
npm run format:check
npm run build
npm run preview
```

## Första versionen

- Registrera, visa, redigera och ta bort böcker.
- Spara titel, författare, ISBN, omslagsadress, beskrivning, datum, betyg och anteckningar.
- Välj mellan Vill läsa, Läser och Läst.
- Sök efter titel och författare. Filtrera efter status och sortera efter titel eller registreringsdatum.
- Spara böcker lokalt och behåll dem efter omladdning.
- Se antal böcker per lässtatus.
- Använd tangentbord och skärmläsare med märkta formulär och fokusstyrda dialoger.

Biblioteket börjar tomt. Inga exempelböcker läggs i användarens data.

## Design

React, TypeScript och Vite utgör grunden. Tailwind CSS 4 använder gemensamma designvärden i `src/index.css`.

Komponenterna i `src/components/ui` följer shadcn/ui:s struktur. Knappen använder CVA och Radix Slot. Dialogen använder Radix Dialog för fokus, Escape och tillgängliga etiketter. `components.json` innehåller shadcn-konfigurationen. Formulär, knappar och statusmarkeringar återanvänds.

## Kodstruktur

```text
src/
  components/       Bokformulär, bokkort och statusmarkering
    ui/             Gemensamma gränssnittskomponenter
  hooks/            Bibliotekets tillstånd och sparflöde
  lib/              Datamodell, validering, sökning och lagring
  App.tsx           Biblioteksvy och dialogflöden
  index.css         Gemensamma designvärden
 tests/             Logiktester och användarflöden
```

`LibraryStorage` håller lagringen skild från gränssnittet. `Book` är den gemensamma datamodellen. Interna UUID:n tillåter flera utgåvor med samma ISBN.

## Lokal lagring

Böcker sparas under `boktok.library.v1` i LocalStorage. Formatet innehåller versionsnummer och en boklista. Appen validerar sparade uppgifter innan läsning. Den blockerar skrivning om befintliga data inte kan läsas. Den uppdaterar gränssnittet först efter lyckad sparning.

Vid sparfel behåller formuläret användarens uppgifter. Vid varje skrivning läser appen om biblioteket. Samtidiga skrivningar från flera flikar har fortfarande ingen transaktionsgaranti. Ladda om en flik för att se ändringar från andra flikar.

Böcker stannar i samma webbläsare och på samma webbplatsadress. Rensad webbläsardata tar bort biblioteket. Privat surfning kan begränsa lagringen. Ingen molnlagring eller säkerhetskopia finns ännu.

Omslagsbilder hämtas från användarens angivna HTTPS-adress. Webbläsaren skickar då en förfrågan till bildens server. Appen använder inga analysverktyg.

## Nästa steg

1. Bokuppslag via Google Books och Open Library.
2. ISBN-skanning med ZXing och omslagstolkning med Tesseract.js.
3. Dubblettkontroll med möjlighet att lägga till ändå.
4. Firebase Authentication, Firestore, testade säkerhetsregler och säker import av lokala böcker.
5. Fullständig statistikvy och ytterligare tillgänglighetskontroller.

Firebase är inte installerat eller aktiverat i den här versionen. Nästa fas behöver ett Firebase-projekt och aktiverad e-postinloggning. Hemliga servernycklar får aldrig placeras i Vite-miljövariabler eller Git.

## Driftsättning

`npm run build` skapar `dist/`. Publicera den mappen på en statisk webbserver över HTTPS. Appen använder inga serversidor eller externa tjänster i denna fas. Använd en stabil adress för att behålla tillgången till lokalt sparade böcker.

GitHub Actions bygger och publicerar appen vid varje ändring på `main`. Arbetsflödet finns i `.github/workflows/deploy.yml`. Det installerar beroenden, kör kodkontroll och tester, bygger appen och publicerar `dist/` på GitHub Pages.

Välj **Settings → Pages → Source → GitHub Actions** i projektet. Arbetsflödet kan också startas manuellt från fliken **Actions**. Inga egna hemliga nycklar behövs.

Appens adress är https://bit-balder.github.io/boktok/. Vite använder `/boktok/` som grundsökväg. Vid lokal utveckling öppnar du också `/boktok/`. Om projektet byter namn eller får egen domän behöver grundsökvägen ändras.

## Verifiering

Elva automatiska tester täcker registrering, omladdning, redigering, borttagning, sökning och lagringsfel. Kodkontroll och produktionsbygge har också körts. Visuell kontroll i en riktig webbläsare återstår eftersom utvecklingsmiljön saknade fungerande förhandsvisning.
