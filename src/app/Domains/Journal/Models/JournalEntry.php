<?php

namespace App\Domains\Journal\Models;

use App\Domains\Auth\Models\User;
use App\Domains\Habits\Models\HealthMetric;
use App\Shared\Casts\EncryptedCast;
use Database\Factories\JournalEntryFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class JournalEntry extends Model
{
    use HasFactory, SoftDeletes;

    protected static function newFactory(): JournalEntryFactory
    {
        return JournalEntryFactory::new();
    }

    protected $fillable = ['user_id', 'date', 'content', 'tags', 'health_metric_id'];

    protected function casts(): array
    {
        return [
            'date'    => 'date',
            'tags'    => 'array',
            'content' => EncryptedCast::class,
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function healthMetric()
    {
        return $this->belongsTo(HealthMetric::class);
    }

    public function scopeForDate($query, string $date)
    {
        return $query->whereDate('date', $date);
    }
}
