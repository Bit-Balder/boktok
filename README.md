# Boktok

Ett personligt bokbibliotek med ett svenskt, mobilanpassat gränssnitt.

## Kom igång

Använd Node.js 22.12 eller senare och npm.

```sh
npm ci
npm run dev
```

Öppna adressen som Vite visar. Manuell bokregistrering behöver inga miljövariabler eller externa konton. Konfigurera Google Books enligt avsnittet nedan.

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

## Iteration 2

- Gemensamma dropdownmenyer med rymliga tryckytor och tangentbordsstöd.
- Kalender med månad och år via rubriken, veckor från måndag och svenska datum.
- Fem klickbara stjärnor, tangentbordsstöd och möjlighet att rensa betyget.
- Bottenmeny för bibliotek, bokregistrering och inställningar.
- Ljust, mörkt och systemstyrt utseende. Valet sparas separat från böckerna.
- Uppdateringsknapp för omladdning från hemskärmens genväg.
- Bekräftelse innan osparade ändringar lämnas eller sidan laddas om.
- Bokuppslag med granskning före sparning.
- Dubblettvarning med möjlighet att se befintlig bok eller lägga till ändå.

### Bokuppslag och integritet

Sökningen använder Google Books först och Open Library vid tomt svar eller fel. Varje datakälla har åtta sekunders tidsgräns. Ny sökning avbryter den föregående. Google Books använder en konfigurerad webbläsarnyckel när den finns. Open Library behöver ingen nyckel. Tjänsterna kan begränsa anrop eller vara otillgängliga. Manuell registrering fungerar även då.

Sökord skickas till boktjänsterna. Lässtatus, betyg och anteckningar skickas inte. Bilder hämtas när ett sparat bokkort visas.

Open Librarys textsökning kan returnera ett verk med flera utgåvor. Appen väljer därför inte ett godtyckligt ISBN. Vid ISBN-sökning behåller den endast ett matchande ISBN.

### Dubbletter och befintliga data

Appen jämför giltiga ISBN, normaliserad titel och författare. Den jämställer ISBN-10 med motsvarande ISBN-13. Samma titel med annan eller saknad författare ger en försiktigare varning. Kontroll sker mot nyligen inläst lokal lagring vid sparning. Redigering jämför inte boken med sig själv.

Iteration 2 behåller `boktok.library.v1` och tidigare bokuppgifter utan migrering. Utseendet lagras under `boktok.theme.v1`. Omladdning raderar inga sparade böcker. Utkast sparas däremot inte automatiskt. Webbläsarens stängningsvarning är ett extra skydd och kan begränsas på mobil.

### Gemensamma komponenter

`ui/select.tsx`, `ui/date-picker.tsx` och `ui/rating.tsx` kan användas i nya formulär. Färgerna följer centrala CSS-variabler för båda utseendena. Radix hanterar fokus och tangentbord i menyer. React DayPicker hanterar kalenderns datum och tangentbordsnavigering.

## Iteration 3 – snabbhantering

Bokvyn sparar lässtatus och betyg direkt. Läst föreslår dagens datum när slutdatum saknas. Kalendern tillåter äldre datum. Tidigare datum bevaras vid andra statusändringar. Klick på vald stjärna tar bort betyget, även i bokformuläret. Tangentbordets piltangenter väljer betyg och mellanslag växlar valt betyg.

Anteckningar öppnas med knappen mellan Redigera och Ta bort. Textfältet ligger under stjärnorna. Sparning stänger textfältet. En diskret prick visar att en anteckning finns. Tom text tar bort anteckningen och pricken. Osparad text skyddas vid stängning och redigering. Borttagning kräver bekräftelse.

Snabbändringar läser biblioteket på nytt och ändrar bara berörda fält. Uppgifter från andra flikar bevaras. Gränssnittet uppdateras efter lyckad skrivning. Fel lämnar sparade värden oförändrade. Fullständig bokredigering använder fortsatt dubblettkontrollen.

Lägg till bok finns i bottenmenyn. Spara och Avbryt ligger i en gemensam fast yta ovanför bottenmenyn. Sidans marginaler lämnar plats för knapparna. Visual Viewport används när webbläsaren rapporterar ett överlagrande skärmtangentbord. Dialoger anpassas till synlig höjd. Beteendet behöver fortfarande provas på fysiska mobiler, särskilt iOS och hemskärmens genväg.

Efter val av sökträff fokuserar appen titeln och scrollar till bokuppgifterna. Mjuk scrollning respekterar systemets inställning för minskad rörelse.

Sökfel loggas med källa och feltyp i konsolen. Appen loggar aldrig nyckel, sökord, anropsadress eller råa felsvar. Lyckad reservsökning visar ingen varning. Om sökningen misslyckas visas ett kort meddelande. Tomma svar från fungerande källor visas som inga träffar.

### Google Books API-nyckel

1. Aktivera **Books API** i Google Cloud-projektet.
2. Skapa en separat standardnyckel för Books API. Återanvänd inte Firebase-nyckeln.
3. Begränsa nyckeln till **Books API** och **Websites**.
4. Tillåt `https://bit-balder.github.io` och `https://bit-balder.github.io/*`.
5. Lägg nyckeln i projektets **Settings → Secrets and variables → Actions** som `GOOGLE_BOOKS_API_KEY`.

GitHub Actions skickar värdet till `VITE_GOOGLE_BOOKS_API_KEY` endast vid produktionsbygget. Kopplingen börjar användas när ändringarna sammanfogas till `main` och publiceras.

Nyckeln ingår i den offentliga webbläsarkoden. GitHub Secrets håller den utanför källkoden men gör den inte hemlig i den publicerade appen. Därför krävs API- och webbplatsbegränsningarna. En helt hemlig nyckel behöver en serverfunktion.

Vid lokal utveckling kopierar du `.env.example` till `.env.local` och fyller i `VITE_GOOGLE_BOOKS_API_KEY`. Använd en separat utvecklingsnyckel med en lokal webbplatsbegränsning vid behov. Checka aldrig in `.env.local` eller riktiga nycklar. Nyckeln kan lämnas tom för manuell registrering och Open Library som reservkälla.

### Kontroll efter sammanfogning

Prova Google Books på den publicerade adressen efter bygget. Kontrollera status, stjärnor, anteckningar och omladdning. Prova även liten mobilskärm, ljust och mörkt läge, kalender och fasta knappar med öppet tangentbord. Lokala tester använder simulerade boktjänster och en testnyckel. De verifierar inte den riktiga nyckelns Google-inställningar.

## Nästa steg

1. ISBN-skanning med ZXing och omslagstolkning med Tesseract.js.
2. Firebase Authentication, Firestore, testade säkerhetsregler och säker import av lokala böcker.
3. Fullständig statistikvy och fler tester på fysiska mobiler.

Firebase är inte installerat eller aktiverat. Nästa fas behöver ett Firebase-projekt och aktiverad e-postinloggning. Hemliga servernycklar får aldrig placeras i Vite-miljövariabler eller Git.

## Driftsättning

`npm run build` skapar `dist/`. Publicera den mappen på en statisk webbserver över HTTPS. Appen behöver ingen egen server. Bokuppslag kontaktar externa boktjänster. Använd en stabil adress för att behålla tillgången till lokalt sparade böcker.

GitHub Actions bygger och publicerar appen vid varje ändring på `main`. Arbetsflödet finns i `.github/workflows/deploy.yml`. Det installerar beroenden, kör kodkontroll och tester, bygger appen och publicerar `dist/` på GitHub Pages.

Välj **Settings → Pages → Source → GitHub Actions** i projektet. Arbetsflödet kan också startas manuellt från fliken **Actions**. Inga egna hemliga nycklar behövs.

Appens adress är https://bit-balder.github.io/boktok/. Vite använder `/boktok/` som grundsökväg. Vid lokal utveckling öppnar du också `/boktok/`. Om projektet byter namn eller får egen domän behöver grundsökvägen ändras.

## Verifiering

Automatiska tester täcker befintlig lagring, registrering, redigering, borttagning, sökning, ISBN, datanormalisering och felhantering. De testar även dubblettval, stjärnor, kalender, tema, bokuppslag och omladdningsskydd.

GitHub Actions kör tester, kodkontroll och produktionsbygge före publicering. Förhandsvisningsservern saknas i utvecklingsmiljön. Visuell mobilkontroll återstår.
