<?php
namespace App\Support;
use PHPMailer\PHPMailer\PHPMailer;
class RegistrarMailer {
    public function configured(): bool {
        return class_exists(PHPMailer::class) && filled(config('registrar_mail.host'))
            && filled(config('registrar_mail.from')) && filled(config('registrar_mail.login_url'))
            && in_array(config('registrar_mail.encryption'),['tls','ssl'],true);
    }
    public function send(string $email, array $credentials): void {
        $mail=new PHPMailer(true);$mail->isSMTP();$mail->SMTPDebug=0;
        $mail->Host=config('registrar_mail.host');$mail->Port=(int)config('registrar_mail.port');
        $mail->SMTPAuth=(bool)config('registrar_mail.auth');
        $mail->Username=(string)config('registrar_mail.username');$mail->Password=(string)config('registrar_mail.password');
        $mail->SMTPSecure=config('registrar_mail.encryption') === 'ssl' ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Timeout=20;$mail->CharSet='UTF-8';
        $mail->setFrom(config('registrar_mail.from'),config('registrar_mail.from_name'));
        $mail->addAddress($email);$mail->Subject='SSIS student login credentials';
        $mail->Body="Your SSIS enrollment is confirmed.\n\nStudent ID: {$credentials['studentNumber']}\nUsername: {$credentials['username']}\nTemporary password: {$credentials['temporaryPassword']}\nStudent login: ".config('registrar_mail.login_url')."\n\nChange your password on first login. Keep these details private.";
        $mail->send();
    }
}
