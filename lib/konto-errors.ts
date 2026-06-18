/**
 * Übersetzt Fehler-Codes aus den Customer-Auth-Actions in deutsche
 * Nutzer-Texte. Bewusst generisch bei Credentials/Enumeration.
 */
export function translateAuthError(code: string): string {
  switch (code) {
    case "INVALID_CREDENTIALS":
      return "E-Mail oder Passwort ist falsch.";
    case "EMAIL_NOT_VERIFIED":
      return "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse. Wir haben Ihnen einen Link geschickt.";
    case "ACCOUNT_LOCKED":
      return "Konto vorübergehend gesperrt nach zu vielen Fehlversuchen. Bitte später erneut versuchen.";
    case "RATE_LIMITED":
      return "Zu viele Versuche. Bitte warten Sie einen Moment.";
    case "WEAK_PASSWORD":
      return "Passwort zu schwach: mindestens 12 Zeichen, je ein Groß- und Kleinbuchstabe und eine Ziffer.";
    case "INVALID_EMAIL":
      return "Bitte geben Sie eine gültige E-Mail-Adresse ein.";
    case "INVALID_TOKEN":
      return "Dieser Link ist ungültig. Bitte fordern Sie einen neuen an.";
    case "TOKEN_EXPIRED":
      return "Dieser Link ist abgelaufen. Bitte fordern Sie einen neuen an.";
    case "INVALID_INPUT":
      return "Bitte füllen Sie alle Felder korrekt aus.";
    default:
      return "Es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.";
  }
}
