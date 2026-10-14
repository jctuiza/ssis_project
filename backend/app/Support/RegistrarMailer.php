<?php

namespace App\Support;

use Aws\Ses\SesClient;
use Illuminate\Mail\Message;
use Illuminate\Support\Facades\Mail;
use LogicException;
use Symfony\Component\Mailer\Bridge\Brevo\Transport\BrevoTransportFactory;
use Symfony\Component\Mailer\Bridge\Postmark\Transport\PostmarkTransportFactory;

class RegistrarMailer
{
    public function configured(): bool
    {
        $mailer = config('mail.default');
        $transport = config('mail.mailers.'.$mailer.'.transport');
        if (! filled(config('mail.from.address')) || ! filter_var(config('registrar_mail.login_url'), FILTER_VALIDATE_URL)) {
            return false;
        }

        // Credential messages must never be routed to a logging or memory transport.
        return match ($transport) {
            'smtp' => filled(config('mail.mailers.'.$mailer.'.host')) || filled(config('mail.mailers.'.$mailer.'.url')),
            'sendmail' => filled(config('mail.mailers.'.$mailer.'.path')),
            'brevo' => class_exists(BrevoTransportFactory::class) && filled(config('services.brevo.key')),
            'resend' => class_exists(\Resend::class) && filled(config('services.resend.key')),
            'postmark' => class_exists(PostmarkTransportFactory::class) && filled(config('services.postmark.key')),
            'ses', 'ses-v2' => class_exists(SesClient::class) && filled(config('services.ses.key')) && filled(config('services.ses.secret')),
            default => false,
        };
    }

    public function send(string $email, array $credentials): void
    {
        if (! $this->configured()) {
            throw new LogicException('A delivery mailer must be configured for credential emails.');
        }
        $body = "Your SSIS enrollment is confirmed.\n\nStudent ID: {$credentials['studentNumber']}\nUsername: {$credentials['username']}\nTemporary password: {$credentials['temporaryPassword']}\nStudent login: ".config('registrar_mail.login_url')."\n\nChange your password on first login. Keep these details private.";
        $sent = Mail::mailer(config('mail.default'))->raw($body, function (Message $message) use ($email): void {
            $message->to($email)->subject('SSIS student login credentials');
        });
        if (! $sent) {
            throw new LogicException('The delivery mailer did not accept the credential message.');
        }
    }
}
