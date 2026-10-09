<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class AdmissionApplication extends Model {
    protected $guarded = [];
    protected $hidden = ['access_hash', 'identity_hash', 'credential_payload'];
    protected function casts(): array { return ['birthdate'=>'date', 'reviewed_at'=>'datetime', 'credentials_expires_at'=>'datetime', 'credentials_emailed_at'=>'datetime', 'credential_email_attempted_at'=>'datetime']; }
}
