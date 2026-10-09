<?php

\Illuminate\Support\Facades\Schedule::call(function () {
    \App\Models\AdmissionApplication::whereNotNull('credential_payload')->where('credentials_expires_at', '<=', now())->update(['credential_payload'=>null]);
})->hourly();
