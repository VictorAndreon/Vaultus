<?php

namespace App\Domains\Finance\Queries;

use Illuminate\Http\Request;

final class TransactionFilters
{
    /**
     * @param  string[]  $types       ex: ['income','expense','transfer']
     * @param  int[]     $accountIds
     * @param  string[]  $categories
     */
    public function __construct(
        public readonly array $types      = [],
        public readonly array $accountIds = [],
        public readonly array $categories = [],
        public readonly ?string $dateFrom = null,
        public readonly ?string $dateTo   = null,
        public readonly ?string $search   = null,
    ) {}

    public static function fromRequest(Request $r): self
    {
        $explode = fn (?string $v) => $v ? array_values(array_filter(array_map('trim', explode(',', $v)))) : [];

        return new self(
            types:      $explode($r->query('types')),
            accountIds: array_map('intval', $explode($r->query('account_ids'))),
            categories: $explode($r->query('categories')),
            dateFrom:   self::parseDate($r->query('date_from')),
            dateTo:     self::parseDate($r->query('date_to')),
            search:     $r->query('search') ? trim((string) $r->query('search')) : null,
        );
    }

    public function toArray(): array
    {
        return [
            'types'       => $this->types,
            'account_ids' => $this->accountIds,
            'categories'  => $this->categories,
            'date_from'   => $this->dateFrom,
            'date_to'     => $this->dateTo,
            'search'      => $this->search,
        ];
    }

    private static function parseDate(?string $v): ?string
    {
        if (! $v) return null;
        try {
            return \Carbon\Carbon::createFromFormat('Y-m-d', $v)->toDateString();
        } catch (\Exception) {
            return null;
        }
    }
}
