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

## Iteration 4 – konto och privat molnbibliotek

Kontodialogen innehåller inloggning med Google och e-post/lösenord, registrering, lösenordsåterställning och utloggning. Firebase Authentication bevarar inloggningen på enheten. Google använder popupfönster för att undvika problem med tredjepartslagring på GitHub Pages. Vid blockerade popupfönster kan användaren tillåta dem eller välja e-postinloggning.

Gästbiblioteket fortsätter använda `boktok.library.v1`. Inloggade användare läser och skriver endast sitt eget molnbibliotek under `users/{uid}/books/{bookId}`. Molnböcker kopieras aldrig till gästlagringen. Firestore använder minnescache. Byte av konto skapar en ny biblioteksvy och stänger den gamla prenumerationen. Misslyckade molnanrop skriver inte till gästbiblioteket.

Snabbändringar använder transaktioner för att bevara samtidiga ändringar. Knappar blockeras medan en skrivning pågår. Bokuppslag och dubblettkontroll fungerar för båda lagringarna. Molnlagring kräver anslutning. Gränssnittet bekräftar sparning först efter lyckat serversvar.

### Import

Efter inloggning erbjuds import av lokala böcker i profildialogen. Användaren granskar en bok i taget. Matchande molnböcker visas innan användaren väljer att importera ändå eller hoppa över. Om en ny matchning tillkommer stoppas importen för ny granskning.

Varje beslut får ett privat kvitto under `users/{uid}/imports/{lokaltBookId}`. Import och kvitto skrivs atomiskt. Upprepade försök skapar inte flera kopior. Ett överhoppningsbeslut sparas också och erbjuds därför inte igen för samma lokala bok på samma konto. Importen uppdaterar inte tidigare importerade böcker automatiskt.

Lokala böcker raderas aldrig av importen, oavsett resultat. Om en lokal bok ändras före import krävs ny granskning. Varje konto har egna importkvitton. En annan användare kan därför importera sina lokala böcker utan att blanda bibliotek.

### Konfiguration före publicering

Firebase-projektet är `boktok-c5e14`. Webbappens offentliga projektinställningar finns i `src/lib/firebase/client.ts`. Google Analytics aktiveras inte.

Lägg till dessa repository-secrets i GitHub:

| Secret                       | Värde                                        |
| ---------------------------- | -------------------------------------------- |
| `FIREBASE_API_KEY`           | Webbappens Firebase `apiKey`                 |
| `FIREBASE_APPCHECK_SITE_KEY` | ID/webbplatsnyckeln för reCAPTCHA Enterprise |

Bygget läser dem som `VITE_FIREBASE_API_KEY` och `VITE_FIREBASE_APPCHECK_SITE_KEY`. Båda värdena är offentliga i den färdiga webbläsarappen. Behåll Firebase-nyckelns Firebase-begränsningar. Använd inte Google Books-nyckeln här. Inga privata servicekontonycklar behövs i appen.

1. Skapa Firestore **Standard edition**, databasen **`(default)`**, i **`europe-north2` (Stockholm)**.
2. Aktivera **Email/Password** och **Google** under Authentication.
3. Lägg till `bit-balder.github.io` under Authentication → Settings → Authorized domains.
4. Registrera webbappen under App Check med **reCAPTCHA Enterprise** och samma poängbaserade webbplatsnyckel som i GitHub.
5. Tillåt domänen `bit-balder.github.io` i reCAPTCHA-inställningarna.
6. **Publicera reglerna från `firestore.rules` innan molnbiblioteket provas.**

Reglerna publiceras inte av GitHub Pages. Öppna Firebase Console → Firestore → Rules, ersätt startreglerna med innehållet i `firestore.rules` och välj **Publish**. Alternativt kan en behörig administratör köra:

```sh
npx firebase login
npx firebase deploy --only firestore:rules --project boktok-c5e14
```

Reglerna nekar andra användares åtkomst och kontrollerar bokmodellens fält. Importkvitton kan inte skrivas över. Behåll Production mode tills reglerna är publicerade. Gör inte databasen öppen för att lösa ett behörighetsfel.

App Check initieras före Auth och Firestore, med automatisk tokenförnyelse. Vänta med **Enforce** tills den publicerade appen visar giltiga anrop i App Check. Aktivera därefter skyddet för de använda tjänsterna. App Check ersätter inte inloggning eller Firestore-regler.

### Lokala kontroller

```sh
npm test
npm run lint
npm run build
npm run test:rules
```

Regeltesterna kräver Java 17 eller senare för den inkluderade Firebase CLI-versionen. Java 21 rekommenderas för framtida CLI-versioner. Testerna startar endast Firestore-emulatorn med projekt-ID `demo-boktok`. De kontaktar inte produktionsdatabasen.

För manuell utveckling kan `.env.local` innehålla testvärden för Firebase-nycklarna och `VITE_FIREBASE_EMULATORS=true`. Starta då både Auth- och Firestore-emulatorerna. Produktionsbygget ignorerar emulatorvalet. En lokal körning mot riktiga Firebase kräver en separat tillåten utvecklingsdomän och korrekt App Check-konfiguration.

### Kontroll efter sammanfogning

Prova Google-inloggning, registrering, lösenordsåterställning och utloggning på den publicerade adressen. Kontrollera med två konton att böckerna hålls isär. Prova import med en dubblett och ladda om för att kontrollera att samma lokala bok inte importeras igen. Kontrollera också att gästbiblioteket finns kvar efter utloggning. Inloggning i hemskärmens genväg och mobilens popuphantering behöver provas på riktiga enheter.

## Nästa steg

1. ISBN-skanning med ZXing och omslagstolkning med Tesseract.js.
2. Fullständig statistikvy och fler tester på fysiska mobiler.

Hemliga servernycklar får aldrig placeras i Vite-miljövariabler eller Git.

## Driftsättning

`npm run build` skapar `dist/`. Publicera den mappen på en statisk webbserver över HTTPS. Appen behöver ingen egen server. Bokuppslag kontaktar externa boktjänster. Konton och molnbibliotek använder Firebase. Använd en stabil adress för att behålla tillgången till lokalt sparade böcker.

GitHub Actions bygger och publicerar appen vid varje ändring på `main`. Arbetsflödet finns i `.github/workflows/deploy.yml`. Det installerar beroenden, kör kodkontroll och tester, bygger appen och publicerar `dist/` på GitHub Pages.

Välj **Settings → Pages → Source → GitHub Actions** i projektet. Arbetsflödet kan också startas manuellt från fliken **Actions**. Inga egna hemliga nycklar behövs.

Appens adress är https://bit-balder.github.io/boktok/. Vite använder `/boktok/` som grundsökväg. Vid lokal utveckling öppnar du också `/boktok/`. Om projektet byter namn eller får egen domän behöver grundsökvägen ändras.

## Verifiering

Automatiska tester täcker befintlig lagring, registrering, redigering, borttagning, sökning, ISBN, datanormalisering och felhantering. De testar även dubblettval, stjärnor, kalender, tema, bokuppslag och omladdningsskydd.

GitHub Actions kör tester, kodkontroll och produktionsbygge före publicering. Konton och import testas med simulerade anrop. Säkerhetsregler, samtidiga molnändringar och import testas dessutom med Firestore-emulatorn. Riktiga Google- och App Check-inställningar samt visuell mobilkontroll behöver verifieras efter publicering.

## Kontoknapp och kompakta bokkort

Inloggningen har en egen knapp högst upp till höger. Dialogen visar e-postinloggning, Google, lösenordsåterställning och registrering i den ordningen. Efter inloggning visar knappen profilbilden eller en profilsymbol. Profildialogen visar namn, e-post, bokantal, utloggning och import av lokala böcker. Inställningar innehåller utseende och omladdning.

Bokformulärets åtgärder visas när ett bokval eller en ändring gjort formuläret osparat. Avbryt och Spara är fristående knappar ovanför bottenmenyn. Spara är större och knapparna ligger centrerade utan gemensam bakgrund. Marginalerna anpassas när knapparna visas.

Bokkorten visar lässtatus och fem stjärnor på samma rad. En anteckningsikon nere till höger visar sparade anteckningar. Smala kort använder kompakta varianter av samma status- och stjärnkomponenter.
