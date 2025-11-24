import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_email(subject: str, body: str, to_email: str):
    """
    Sends an email using SMTP configuration from environment variables.
    Falls back to logging if configuration is missing.
    """
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = os.getenv("SMTP_PORT")
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    email_from = os.getenv("EMAIL_FROM")

    if not all([smtp_server, smtp_port, smtp_user, smtp_password, email_from]):
        print(f"[{subject}] To: {to_email}\nBody: {body}\n(Email not sent: Missing SMTP config)")
        return

    try:
        msg = MIMEMultipart()
        msg["From"] = email_from
        msg["To"] = to_email
        msg["Subject"] = subject

        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(smtp_server, int(smtp_port)) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(email_from, to_email, msg.as_string())
        
        print(f"Email sent to {to_email}: {subject}")
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
