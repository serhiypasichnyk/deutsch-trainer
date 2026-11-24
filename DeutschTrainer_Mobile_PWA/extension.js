/* Esercizi originali: espansione contestuale A1–C2, non riproduzioni di prove Goethe. */
(function(){
const persons=['Anna','Lena','Milan','Sophie','Daniel','Mira','David','Laura','Nina','Jonas','Clara','Oliver'];
const days=['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
const times=['acht Uhr','neun Uhr','zehn Uhr','elf Uhr','vierzehn Uhr','fünfzehn Uhr'];
const cities=['Saarbrücken','Trier','Mainz','Koblenz','Bonn','Köln'];
const shops=['Bäckerei','Apotheke','Buchhandlung','Post','Bibliothek','Metzgerei'];
function reading(level,title,text,qs){qs.forEach(([p,a,options,why])=>{q(level,title,p,a,options,why);const item=BANK[BANK.length-1];item.kind='reading';item.title=title;item.passage=text;});}
for(let i=0;i<12;i++){
  const name=persons[i],day=days[i%days.length],time=times[i%times.length],city=cities[i%cities.length],shop=shops[i%shops.length];
  const other=shops[(i+2)%shops.length];
  reading('A1','Ein Tag in der Stadt',`${name} wohnt in ${city}. Am ${day} geht ${name} um ${time} in die ${shop}. Danach geht ${name} in die ${other}. Am Abend ist ${name} wieder zu Hause.`,[
    ['In welcher Stadt wohnt die Person?',city,[city,cities[(i+1)%6],cities[(i+2)%6]],'Die Stadt wird am Anfang genannt.'],
    ['An welchem Tag geht die Person einkaufen?',day,[day,days[(i+1)%6],days[(i+2)%6]],'Im Text steht: Am '+day+'.'],
    ['Wohin geht die Person zuerst?','in die '+shop,['in die '+shop,'in die '+other,'zum Bahnhof'],'Zuerst besucht sie die '+shop+'.']
  ]);
  const amount=[3,4,5,6][i%4],fruit=['Äpfel','Bananen','Orangen','Birnen'][i%4],drink=['Wasser','Saft','Milch','Tee'][i%4];
  reading('A1','Der Einkauf',`${name} kauft am ${day} im Supermarkt ${amount} ${fruit} und eine Flasche ${drink}. An der Kasse bezahlt ${name} mit Karte. Zu Hause macht ${name} das Abendessen.`,[
    ['Was kauft die Person?',fruit,[fruit,['Birnen','Orangen','Äpfel','Bananen'][(i+2)%4],'Brot'],'Im Text werden '+fruit+' gekauft.'],
    ['Wie bezahlt die Person?','mit Karte',['mit Karte','bar','gar nicht'],'An der Kasse bezahlt sie mit Karte.'],
    ['Was macht die Person zu Hause?','das Abendessen',['das Abendessen','die Hausaufgaben','einen Spaziergang'],'Zu Hause macht sie das Abendessen.']
  ]);
  const work=['Büro','Restaurant','Krankenhaus','Hotel'][i%4],end=['16 Uhr','17 Uhr','18 Uhr','19 Uhr'][i%4];
  reading('A1','Bei der Arbeit',`${name} arbeitet in einem ${work} in ${city}. Die Arbeit beginnt um ${time} und endet um ${end}. In der Pause telefoniert ${name} mit einem Freund. Am ${day} hat ${name} einen freien Tag.`,[
    ['Wo arbeitet die Person?','in einem '+work,['in einem '+work,'in der Schule','im Garten'],'Der Arbeitsplatz steht im ersten Satz.'],
    ['Was macht die Person in der Pause?','telefonieren',['telefonieren','schlafen','kochen'],'In der Pause telefoniert sie.'],
    ['Was hat die Person am '+day+'?','einen freien Tag',['einen freien Tag','eine Prüfung','einen Arzttermin'],'Der Text nennt einen freien Tag.']
  ]);
}
for(let i=0;i<12;i++){
 const name=persons[i],city=cities[i%6],day=days[i%6],time=times[i%6],price=650+25*i,another=days[(i+2)%6];
 reading('A2','Wohnung besichtigen',`${name} sucht eine neue Wohnung in ${city}, weil der bisherige Arbeitsweg zu lang ist. Eine Wohnung mit zwei Zimmern kostet ${price} Euro im Monat. Strom und Heizung sind nicht in der Miete enthalten. Der Vermieter kann die Wohnung am ${day} um ${time} zeigen. ${name} schreibt ihm deshalb eine E-Mail und fragt nach der Kaution.`,[
  ['Warum sucht die Person eine Wohnung?','Der Arbeitsweg ist zu lang.',['Der Arbeitsweg ist zu lang.','Die Wohnung ist zu klein.','Das Haus wird verkauft.'],'Der lange Arbeitsweg wird als Grund genannt.'],
  ['Was kostet die Wohnung monatlich?',String(price)+' Euro',[String(price)+' Euro',String(price+100)+' Euro',String(price-100)+' Euro'],'Die monatliche Miete steht ausdrücklich im Text.'],
  ['Sind Strom und Heizung in der Miete enthalten?','Nein',['Nein','Ja','Nur die Heizung'],'Beide Kosten werden zusätzlich berechnet.']
 ]);
 const train=['Regionalzug','Bus','S-Bahn'][i%3],delay=[10,15,20,25][i%4];
 reading('A2','Eine Verspätung',`${name} möchte am ${day} mit dem ${train} nach ${city} fahren. Am Bahnhof steht auf der Anzeige, dass die Verbindung ${delay} Minuten Verspätung hat. Deshalb ruft ${name} im Büro an und sagt, dass sie oder er später kommt. Die Fahrkarte bleibt gültig. Der nächste Anschluss fährt erst am ${another}.`,[
  ['Wie groß ist die Verspätung?',delay+' Minuten',[delay+' Minuten',(delay+10)+' Minuten',(delay+20)+' Minuten'],'Die Verspätung wird in Minuten angegeben.'],
  ['Wen informiert die Person?','das Büro',['das Büro','den Arzt','die Eltern'],'Die Person ruft im Büro an.'],
  ['Was passiert mit der Fahrkarte?','Sie bleibt gültig.',['Sie bleibt gültig.','Sie wird ungültig.','Sie muss umgetauscht werden.'],'Der Text sagt ausdrücklich: Die Fahrkarte bleibt gültig.']
 ]);
 reading('A2','Termin verschieben',`${name} hat am ${day} um ${time} einen Termin bei einer Ärztin. Leider muss ${name} am selben Tag länger arbeiten. Deshalb ruft ${name} in der Praxis an und bittet um einen neuen Termin. Die Sprechstundenhilfe schlägt den ${another} vor. ${name} ist damit einverstanden und notiert das Datum im Kalender.`,[
  ['Warum kann die Person den ursprünglichen Termin nicht wahrnehmen?','Wegen der Arbeit',['Wegen der Arbeit','Wegen des Wetters','Wegen einer Reise'],'Sie muss am selben Tag länger arbeiten.'],
  ['Was macht die Person zuerst?','Sie ruft in der Praxis an.',['Sie ruft in der Praxis an.','Sie schreibt an die Polizei.','Sie fährt zur Apotheke.'],'Zuerst ruft sie in der Arztpraxis an.'],
  ['Was macht sie mit dem neuen Termin?','Sie notiert ihn im Kalender.',['Sie notiert ihn im Kalender.','Sie sagt sofort ab.','Sie vergisst ihn.'],'Der neue Termin wird notiert.']
 ]);
}
for(let i=0;i<12;i++){
 const name=persons[i],city=cities[i%6],day=days[i%6],time=times[i%6],amount=[450,600,750,900][i%4],alternative=days[(i+3)%6];
 reading('B1','Eine Bewerbung',`${name} hat mehrere Jahre in einem technischen Betrieb gearbeitet. Seit dem Umzug nach ${city} sucht ${name} eine neue Stelle. Vor zwei Wochen schickte ${name} eine Bewerbung an eine Firma, die praktische Erfahrung und Zuverlässigkeit voraussetzt. Am ${day} erhielt ${name} eine Einladung zu einem Vorstellungsgespräch um ${time}. Vor dem Gespräch informiert sich ${name} über die Produkte des Unternehmens und überlegt, welche Fragen zu den Arbeitszeiten wichtig sein könnten. Besonders interessiert sich ${name} für Fortbildungsmöglichkeiten, weil sie oder er langfristig im Unternehmen bleiben möchte.`,[
 ['Was ist der wichtigste Grund für die Bewerbung?','Die Person sucht nach einem Umzug eine Stelle.',['Die Person sucht nach einem Umzug eine Stelle.','Sie möchte die Schule abbrechen.','Sie hat eine Prüfung nicht bestanden.'],'Die Stellensuche folgt auf den Umzug.'],
 ['Was verlangt die Firma?','Praktische Erfahrung und Zuverlässigkeit',['Praktische Erfahrung und Zuverlässigkeit','Ein abgeschlossenes Studium in Medizin','Erfahrung im Ausland und ein Auto'],'Die Anforderungen werden im Text ausdrücklich genannt.'],
 ['Weshalb fragt die Person nach Fortbildung?','Sie möchte langfristig dort arbeiten.',['Sie möchte langfristig dort arbeiten.','Sie möchte sofort kündigen.','Sie will den Arbeitsweg verkürzen.'],'Die langfristige Perspektive ist ihre Motivation.']
 ]);
 reading('B1','Ein Problem mit der Heizung',`${name} wohnt seit wenigen Monaten in einer Mietwohnung in ${city}. Seit drei Tagen funktioniert die Heizung im Wohnzimmer nicht mehr. Zunächst versuchte ${name}, den Fehler selbst zu finden, konnte das Problem aber nicht lösen. Am ${day} schrieb ${name} deshalb dem Vermieter und schilderte die Situation. Der Vermieter versprach, bis ${alternative} einen Handwerker zu schicken. Da die Außentemperaturen niedrig sind, bittet ${name} zusätzlich um eine schriftliche Bestätigung. Die jährlichen Nebenkosten betragen ungefähr ${amount} Euro, doch die genaue Höhe der Reparaturkosten ist noch nicht bekannt.`,[
 ['Was funktioniert nicht?','Die Heizung im Wohnzimmer',['Die Heizung im Wohnzimmer','Der Aufzug','Die Waschmaschine'],'Das Problem betrifft ausdrücklich die Heizung im Wohnzimmer.'],
 ['An wen wendet sich die Person?','An den Vermieter',['An den Vermieter','An den Arbeitgeber','An die Krankenkasse'],'Die Person schreibt dem Vermieter.'],
 ['Was möchte die Person zusätzlich erhalten?','Eine schriftliche Bestätigung',['Eine schriftliche Bestätigung','Eine neue Wohnung','Eine kostenlose Fahrkarte'],'Die Bestätigung wird aufgrund der niedrigen Temperaturen angefordert.']
 ]);
 reading('B1','Eine Weiterbildung',`${name} arbeitet in ${city} und möchte sich beruflich weiterentwickeln. Eine Bildungseinrichtung bietet einen Kurs an, in dem technische Grundlagen und praktische Übungen miteinander verbunden werden. Der Unterricht beginnt am ${day} um ${time}. Die Teilnahme kostet ${amount} Euro, aber Beschäftigte bestimmter Betriebe können eine Ermäßigung beantragen. ${name} möchte vor der Anmeldung klären, ob der Kurs mit den Arbeitszeiten vereinbar ist. Deshalb spricht ${name} mit der Vorgesetzten und bittet um die Möglichkeit, an zwei Nachmittagen früher zu gehen.`,[
 ['Was ist das Ziel der Weiterbildung?','Sich beruflich weiterentwickeln',['Sich beruflich weiterentwickeln','Den Wohnort wechseln','Die Arbeit sofort aufgeben'],'Berufliche Weiterentwicklung ist das Ziel.'],
 ['Warum spricht die Person mit der Vorgesetzten?','Um die Arbeitszeiten abzustimmen',['Um die Arbeitszeiten abzustimmen','Um einen Kredit zu beantragen','Um eine Wohnung zu kündigen'],'Es geht um die Vereinbarkeit von Kurs und Arbeit.'],
 ['Was können manche Beschäftigte beantragen?','Eine Ermäßigung',['Eine Ermäßigung','Eine Fahrprüfung','Eine Aufenthaltserlaubnis'],'Manche Betriebe ermöglichen eine Ermäßigung.']
 ]);
 reading('B1','Eine Lieferung',`${name} hat in einem Möbelgeschäft in ${city} einen Schreibtisch bestellt. Laut Auftragsbestätigung sollte die Lieferung am ${day} erfolgen. Am vereinbarten Tag blieb ${name} von ${time} bis zum Abend zu Hause, aber niemand erschien. Auch eine Benachrichtigung wurde nicht hinterlassen. ${name} wandte sich daraufhin an den Kundenservice. Dort entschuldigte sich eine Mitarbeiterin für die Verspätung und bot einen Ersatztermin am ${alternative} an. ${name} stimmte zu, bestand jedoch darauf, dass der neue Termin schriftlich bestätigt wird, damit es nicht erneut zu Missverständnissen kommt.`,[
 ['Was wurde bestellt?','Ein Schreibtisch',['Ein Schreibtisch','Ein Fernseher','Ein Kühlschrank'],'Im ersten Satz steht Schreibtisch.'],
 ['Warum ist die Person unzufrieden?','Die Lieferung blieb ohne Nachricht aus.',['Die Lieferung blieb ohne Nachricht aus.','Das Produkt war zu billig.','Die Rechnung war zu niedrig.'],'Die Lieferung fand nicht statt und es gab keine Benachrichtigung.'],
 ['Welche Bedingung stellt die Person?','Eine schriftliche Bestätigung',['Eine schriftliche Bestätigung','Eine Barzahlung','Eine andere Farbe'],'Der Ersatztermin soll schriftlich bestätigt werden.']
 ]);
}
for(let i=0;i<10;i++){
 const city=cities[i%6],name=persons[i],ratio=15+i;
 reading('B2','Arbeiten zwischen Büro und Zuhause',`In einem mittelständischen Unternehmen in ${city} wird derzeit darüber diskutiert, wie viel Homeoffice künftig möglich sein soll. Die Geschäftsleitung verweist auf die Bedeutung persönlicher Zusammenarbeit und befürchtet, dass der informelle Austausch zwischen den Abteilungen verloren gehen könnte. Einige Beschäftigte halten dagegen, dass sie bei konzentrierten Aufgaben von zu Hause aus produktiver arbeiten. Andere weisen darauf hin, dass nicht alle Tätigkeiten aus der Ferne erledigt werden können. ${name} schlägt deshalb vor, zunächst eine zeitlich begrenzte Regelung zu testen und die Ergebnisse anschließend anhand nachvollziehbarer Kriterien zu bewerten. Entscheidender als eine feste Anwesenheitsquote sei, ob die Aufgaben zuverlässig erledigt werden und sich die Mitarbeitenden ausreichend austauschen können.`,[
 ['Welches Gegenargument zur Heimarbeit nennt die Geschäftsleitung?','Der persönliche Austausch könnte leiden.',['Der persönliche Austausch könnte leiden.','Die Miete der Beschäftigten steigt.','Das Unternehmen darf keine Computer nutzen.'],'Die Geschäftsleitung betont die informelle Zusammenarbeit.'],
 ['Was ist der Kern des vorgeschlagenen Kompromisses?','Eine befristete Testphase mit Auswertung',['Eine befristete Testphase mit Auswertung','Ein dauerhaftes Verbot','Eine sofortige vollständige Umstellung'],'Der Vorschlag kombiniert Testphase und überprüfbare Kriterien.'],
 ['Welches Kriterium wird besonders hervorgehoben?','Die zuverlässige Aufgabenerfüllung',['Die zuverlässige Aufgabenerfüllung','Die Anzahl der Bürostühle','Der Wohnort aller Beschäftigten'],'Ergebnisse und Austausch sollen wichtiger sein als eine starre Quote.']
 ]);
 reading('B2','Mobilität und Stadtentwicklung',`Die Stadt ${city} prüft, ob sie zusätzliche Mittel in den öffentlichen Nahverkehr investieren soll. Befürworter argumentieren, dass dichtere Verbindungen den Autoverkehr verringern und Menschen ohne eigenes Fahrzeug mehr Möglichkeiten eröffnen könnten. Kritiker weisen dagegen darauf hin, dass neue Linien laufende Kosten verursachen und in dünn besiedelten Gebieten häufig nur wenige Fahrgäste erreichen. Der zuständige Ausschuss möchte daher zunächst untersuchen, wie sich unterschiedliche Fahrpläne auf die Nachfrage auswirken. Eine Entscheidung allein aufgrund der Anschaffungskosten, so die Vorsitzende, würde langfristige gesellschaftliche Vorteile ebenso ausblenden wie mögliche finanzielle Risiken.`,[
 ['Was ist ein Argument der Befürworter?','Mehr Mobilität ohne eigenes Auto',['Mehr Mobilität ohne eigenes Auto','Weniger Verbindungen in Randgebiete','Sofort höhere Ticketpreise'],'Im Text wird Teilhabe ohne Auto ausdrücklich genannt.'],
 ['Welche Sorge äußern die Kritiker?','Hohe laufende Kosten bei geringer Nachfrage',['Hohe laufende Kosten bei geringer Nachfrage','Zu viele Fahrräder in der Innenstadt','Keine freie Auswahl zwischen Verkehrsmitteln'],'Die Kritiker sprechen von Kosten und wenigen Fahrgästen.'],
 ['Warum wird vor einer reinen Kostenbetrachtung gewarnt?','Sie übersieht gesellschaftliche Vorteile und Risiken.',['Sie übersieht gesellschaftliche Vorteile und Risiken.','Sie berücksichtigt zu viele unterschiedliche Faktoren.','Sie führt automatisch zum Bau neuer Straßen.'],'Entscheidungen sollen auf mehreren Kriterien beruhen.']
 ]);
}
for(let i=0;i<8;i++){
 const name=persons[i],city=cities[i%6];
 reading('C1','Innovation und Verantwortung',`In einer Diskussionsrunde an der Universität ${city} wurde die Frage aufgeworfen, ob digitale Technologien grundsätzlich als Fortschritt gelten können. ${name} widersprach der verbreiteten Annahme, dass technische Leistungsfähigkeit zwangsläufig gesellschaftlichen Nutzen hervorbringe. Entscheidend sei vielmehr, welche Gruppen Zugang zu den neuen Möglichkeiten erhielten, welche Abhängigkeiten entstünden und wer über die Verteilung möglicher Risiken entscheide. Die Teilnehmerinnen und Teilnehmer einigten sich darauf, zwischen kurzfristig messbaren Effizienzgewinnen und langfristigen Folgen für Selbstbestimmung und Chancengleichheit zu unterscheiden. Die Debatte zeigte dabei weniger einen Gegensatz zwischen technikfreundlichen und technikskeptischen Positionen als vielmehr die Notwendigkeit, scheinbar eindeutige Begriffe sorgfältiger zu definieren.`,[
 ['Welche Annahme wird kritisiert?','Technische Leistung bedeutet automatisch gesellschaftlichen Fortschritt.',['Technische Leistung bedeutet automatisch gesellschaftlichen Fortschritt.','Jede Technik ist grundsätzlich schädlich.','Digitale Innovationen werden nur an Universitäten entwickelt.'],'Technische Leistungsfähigkeit und gesellschaftlicher Nutzen werden unterschieden.'],
 ['Welche Perspektiven sollen getrennt betrachtet werden?','Kurzfristige Effizienz und langfristige gesellschaftliche Folgen',['Kurzfristige Effizienz und langfristige gesellschaftliche Folgen','Forschende und Studierende','Arbeitszeit und Freizeit'],'Die Debatte unterscheidet kurzfristige und langfristige Wirkungen.'],
 ['Wie lässt sich die Schlussfolgerung am besten zusammenfassen?','Die Debatte verlangt begriffliche Präzision.',['Die Debatte verlangt begriffliche Präzision.','Alle Beteiligten lehnen neue Technologien ab.','Die wirtschaftliche Effizienz ist das einzige Kriterium.'],'Der letzte Satz betont die sorgfältigere Definition der Begriffe.']
 ]);
}
for(let i=0;i<8;i++){
 const name=persons[i];
 reading('C2','Die Grenzen eindeutiger Deutungen',`In einem Essay vertritt ${name} die Auffassung, dass der Wunsch nach eindeutigen Erklärungen gelegentlich mit einer Verkürzung des Erkenntnisinteresses einhergehe. Ein Modell könne durchaus verlässliche Aussagen liefern, ohne damit schon die Vielzahl möglicher Deutungen abschließend zu erfassen. Problematisch werde es erst, wenn der methodisch begrenzte Geltungsanspruch stillschweigend in eine umfassende Aussage über die Wirklichkeit umgedeutet werde. Die damit verbundene scheinbare Gewissheit sei dann weniger das Ergebnis einer besonders gründlichen Prüfung als das Produkt ausgeblendeter Voraussetzungen. Der Text plädiert deshalb nicht für einen grundsätzlichen Verzicht auf klare Urteile, sondern für ihre ausdrückliche Bindung an überprüfbare Bedingungen und für die Bereitschaft, widersprechende Befunde als Anstoß zur Revision ernst zu nehmen.`,[
 ['Welche Kritik richtet sich gegen scheinbar umfassende Erklärungen?','Sie können ihre Voraussetzungen verbergen.',['Sie können ihre Voraussetzungen verbergen.','Sie müssen grundsätzlich falsch sein.','Sie sind immer zu kurz formuliert.'],'Die Verschleierung von Voraussetzungen steht im Mittelpunkt.'],
 ['Welche Haltung zu klaren Urteilen vertritt der Text?','Sie sind möglich, müssen aber begrenzt und überprüfbar bleiben.',['Sie sind möglich, müssen aber begrenzt und überprüfbar bleiben.','Sie sind grundsätzlich unzulässig.','Sie sollten unabhängig von Gegenbeweisen bestehen.'],'Der Text verwirft Klarheit nicht, sondern bindet sie an Bedingungen.'],
 ['Welche Funktion haben widersprechende Befunde?','Sie können eine Revision anstoßen.',['Sie können eine Revision anstoßen.','Sie müssen ignoriert werden.','Sie beweisen, dass jede Methode wertlos ist.'],'Widersprechende Befunde sind Anlass zur Überprüfung.']
 ]);
}
const grammarSets={
 'A2':[
  ['Ich interessiere mich ___ einen Sprachkurs.','für',['für','mit','bei','aus'],'Sich interessieren für + Akkusativ.'],
  ['Gestern ___ wir die Wohnung besichtigt.','haben',['haben','sind','hat','waren'],'Besichtigen bildet das Perfekt mit haben.'],
  ['Ich habe keine Zeit, ___ ich noch arbeiten muss.','weil',['weil','denn','trotzdem','sondern'],'Weil leitet eine Nebensatzstruktur ein.'],
  ['Ich warte ___ den nächsten Bus.','auf',['auf','an','mit','von'],'Warten auf + Akkusativ.'],
  ['Sie hat gesagt, ___ sie morgen kommt.','dass',['dass','denn','aber','obwohl'],'Aussagesatz mit dass.']
 ],
 'B1':[
  ['Wenn ich mehr Zeit ___, würde ich jeden Tag üben.','hätte',['hätte','habe','hatte','hätten'],'Konjunktiv II: wenn ich hätte.'],
  ['Obwohl die Wohnung teuer ___, nehmen wir sie.','ist',['ist','sein','warum','sind'],'Obwohl leitet eine Nebensatzstruktur ein.'],
  ['Der Mann, ___ hier arbeitet, ist sehr freundlich.','der',['der','den','dem','dessen'],'Relativpronomen als Subjekt im Nominativ.'],
  ['Das Formular muss heute ___ werden.','ausgefüllt',['ausgefüllt','ausfüllen','füllt aus','ausfüllte'],'Passiv mit müssen: Partizip II + werden.'],
  ['Sie hat beschlossen, sich für die Stelle ___.','zu bewerben',['zu bewerben','bewerben zu','bewirbt','beworben'],'Infinitivgruppe mit zu.'],
  ['Ich weiß nicht, ___ der Kurs morgen stattfindet.','ob',['ob','weil','denn','obwohl'],'Indirekte Entscheidungsfrage mit ob.'],
  ['Je früher wir anfangen, ___ früher sind wir fertig.','desto',['desto','denn','sondern','trotz'],'Je ... desto.'],
  ['Seitdem ich hier wohne, ___ ich täglich Deutsch.','lerne',['lerne','lernen','gelernt','lernt'],'Nach vorangestelltem Nebensatz folgt das finite Verb.'],
  ['Wegen ___ Wetters bleiben wir zu Hause.','des schlechten',['des schlechten','dem schlechten','den schlechten','der schlechten'],'Wegen + Genitiv (Standard).'],
  ['Ich erinnere mich ___ unser letztes Treffen.','an',['an','auf','über','bei'],'Sich erinnern an + Akkusativ.'],
  ['Denkst du daran, den Antrag morgen ___?','abzugeben',['abzugeben','geben ab','abgegeben','geben zu'],'Bei trennbarem Verb steht zu zwischen Präfix und Stamm.'],
  ['Er hat gesagt, dass er später kommen ___.','würde',['würde','wird er','kommt','wollte zu'],'Indirekte Rede im Konjunktiv II.']
 ],
 'B2':[
  ['Die Unterlagen hätten früher ___ werden müssen.','eingereicht',['eingereicht','einreichen','einreicht','eingereichen'],'Modalpassiv im Konjunktiv II Vergangenheit.'],
  ['Die Gründe sind nachvollziehbar; ___ halte ich den Vorschlag für riskant.','dennoch',['dennoch','weil','während','und dass'],'Dennoch drückt einen Gegensatz aus.'],
  ['Er ging davon aus, ___ alle informiert worden seien.','dass',['dass','denn','falls','obwohl'],'Ausgehen davon, dass...'],
  ['___ der hohen Kosten wurde das Projekt fortgesetzt.','Trotz',['Trotz','Wegen des','Sobald','Indem'],'Trotz + Genitiv signalisiert Konzession.']
 ],
 'C1':[
  ['___ der vorliegenden Daten bleibt die Schlussfolgerung unsicher.','Angesichts',['Angesichts','Trotzdem','Ausgerechnet','Schließlich'],'Angesichts + Genitiv.'],
  ['Es ist fraglich, inwiefern die Maßnahme tatsächlich ___.','wirksam ist',['wirksam ist','ist wirksam','wirksame','wirksam wäre ist'],'Indirekte Frage mit Verb am Schluss.'],
  ['Die neuen Befunde lassen die bisherige Annahme ___ erscheinen.','zweifelhaft',['zweifelhaft','zweifelhaftes','zweifeln','zweifelhaftere'],'Lassen + Infinitiv + Prädikativ.']
 ],
 'C2':[
  ['So einleuchtend diese Erklärung auch ___, sie bleibt unvollständig.','erscheinen mag',['erscheinen mag','mag erscheinen sie','erscheint mag','wäre erscheinen'],'Konzessive Formel mit mögen.'],
  ['Die Schlussfolgerung bedarf ___ Prüfung.','einer erneuten',['einer erneuten','eine erneute','einen erneuten','ein erneuter'],'Bedürfen + Genitiv.'],
  ['Widersprüche dürfen nicht als bloße Randerscheinungen ___ werden.','abgetan',['abgetan','abtun','abtat','abtut'],'Passiv: abgetan werden.']
 ]
};
for(const [level,items] of Object.entries(grammarSets))for(const [p,a,opts,e] of items)q(level,'Grammatik im Kontext',p,a,opts,e);
const scenarios={
 'A1':[['Ordina una torta per otto persone e chiedi il prezzo.','Guten Tag! Ich möchte einen Kuchen für acht Personen. Wie viel kostet er?'],['Chiedi dove si trova la fermata del bus.','Entschuldigung, wo ist die Bushaltestelle?'],['Presentati e di’ dove abiti.','Guten Tag! Ich heiße Lena und wohne in Saarbrücken.'],['Chiedi se un negozio è aperto oggi.','Ist das Geschäft heute geöffnet?'],['Compra una bottiglia d’acqua e paga con carta.','Eine Flasche Wasser, bitte. Ich möchte mit Karte bezahlen.']],
 'A2':[['Chiedi al proprietario se le spese della casa sono incluse.','Guten Tag! Sind die Nebenkosten in der Miete enthalten?'],['Avvisa un amico che arriverai in ritardo a causa del treno.','Mein Zug hat Verspätung. Ich komme ungefähr zwanzig Minuten später.'],['Fissa una visita per un appartamento.','Ich interessiere mich für die Wohnung. Könnte ich sie am Freitag besichtigen?'],['Chiedi informazioni sulle possibilità di pagamento in un negozio.','Kann ich mit Karte bezahlen oder muss ich bar bezahlen?'],['Spiega al medico da quanto tempo ti fa male la schiena.','Seit drei Tagen habe ich Rückenschmerzen.']],
 'B1':[['Chiedi a un datore di lavoro un colloquio e spiega la tua esperienza.','Ich habe mehrere Jahre Erfahrung in diesem Bereich und würde mich gern persönlich vorstellen.'],['Presenta un reclamo per una consegna mancata.','Die Lieferung ist nicht angekommen, obwohl ich den ganzen Tag zu Hause war. Bitte schlagen Sie einen neuen Termin vor.'],['Scrivi al proprietario perché il riscaldamento non funziona.','Seit gestern funktioniert die Heizung nicht. Könnten Sie bitte so bald wie möglich einen Handwerker schicken?'],['Chiedi un corso di formazione e spiega a cosa ti serve.','Ich möchte an dem Kurs teilnehmen, weil ich meine beruflichen Kenntnisse erweitern möchte.'],['Motiva una scelta tra lavoro a tempo pieno e part-time.','Ich würde eine Teilzeitstelle bevorzugen, weil ich mehr Zeit für meine Familie brauche.'],['Spiega a un ufficio perché ti serve un appuntamento diverso.','Leider kann ich den vorgeschlagenen Termin nicht wahrnehmen. Wäre ein Termin am Montag möglich?'],['Chiedi maggiori informazioni su assicurazione e costi.','Könnten Sie mir bitte erklären, welche Leistungen versichert sind und welche Kosten zusätzlich entstehen?'],['Descrivi un problema con il trasporto pubblico.','Der Bus ist ausgefallen, deshalb komme ich später zur Arbeit. Ich informiere meinen Vorgesetzten.']],
 'B2':[['Esponi un vantaggio e uno svantaggio del lavoro da remoto.','Einerseits erleichtert das Homeoffice die Vereinbarkeit von Beruf und Familie, andererseits kann der direkte Austausch leiden.'],['Argomenta perché una città dovrebbe investire nei trasporti.','Ein verlässlicher Nahverkehr könnte die Mobilität verbessern, auch wenn zunächst hohe Investitionen erforderlich wären.'],['Rispondi a una critica al tuo progetto, riconoscendone un punto valido.','Ihr Einwand ist nachvollziehbar. Allerdings sollten wir auch die langfristigen Auswirkungen berücksichtigen.'],['Proponi un compromesso sulle ore di formazione.','Ich schlage vor, die Schulung zunächst als Pilotprojekt zu organisieren und anschließend die Ergebnisse auszuwerten.']],
 'C1':[['Presenta una proposta valutando rischi e benefici.','Bei der Bewertung sollten sowohl kurzfristige Effizienzgewinne als auch langfristige soziale Folgen berücksichtigt werden.'],['Discuta i limiti di un indicatore statistico.','Obwohl die Kennzahl einen ersten Überblick ermöglicht, lässt sie wichtige qualitative Unterschiede außer Acht.'],['Difendi una decisione con un registro professionale.','Angesichts der verfügbaren Informationen erscheint mir diese Vorgehensweise insgesamt vertretbar.']],
 'C2':[['Contesta cortesemente l’idea che un risultato dimostri una causalità.','So deutlich die Korrelation auch sein mag, daraus lässt sich noch kein zwingender Kausalzusammenhang ableiten.'],['Distingui precisione concettuale e certezza assoluta in una discussione.','Die begriffliche Präzision der Aussage darf nicht mit einem uneingeschränkten Geltungsanspruch verwechselt werden.'],['Riformula una critica con prudenza epistemica.','Es wäre verfrüht, die Befunde als abschließend zu betrachten, solange konkurrierende Erklärungen nicht angemessen geprüft wurden.']]
};
for(const [level,items] of Object.entries(scenarios))for(const [p,a] of items)free(level,'Dialogo guidato',p,a,'Una possibile risposta. Valuta personalmente struttura, significato e registro.','dialog');
})();
