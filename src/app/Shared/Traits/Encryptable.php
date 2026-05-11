<?php

namespace App\Shared\Traits;

use App\Shared\Casts\EncryptedCast;

trait Encryptable
{
    protected function getEncryptedCasts(): array
    {
        return array_fill_keys($this->encryptable ?? [], EncryptedCast::class);
    }

    protected function casts(): array
    {
        return array_merge(
            parent::casts(),
            $this->getEncryptedCasts()
        );
    }
}
