<?php
return [
    'host'=>env('SMTP_HOST'), 'port'=>env('SMTP_PORT',587), 'auth'=>env('SMTP_AUTH',true),
    'username'=>env('SMTP_USERNAME'), 'password'=>env('SMTP_PASSWORD'), 'encryption'=>env('SMTP_ENCRYPTION','tls'),
    'from'=>env('SMTP_FROM_ADDRESS'), 'from_name'=>env('SMTP_FROM_NAME','SSIS Registrar'),
    'login_url'=>env('STUDENT_LOGIN_URL'),
];
