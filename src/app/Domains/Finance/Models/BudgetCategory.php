<?php
namespace App\Domains\Finance\Models;

use App\Shared\Casts\EncryptedCast;
use App\Domains\Auth\Models\User;
use Illuminate\Database\Eloquent\Model;

class BudgetCategory extends Model
{
    protected $fillable = ['user_id', 'name', 'budget_amount_encrypted', 'color', 'position'];

    protected function casts(): array
    {
        return ['budget_amount_encrypted' => EncryptedCast::class];
    }

    public function user() { return $this->belongsTo(User::class); }
}
