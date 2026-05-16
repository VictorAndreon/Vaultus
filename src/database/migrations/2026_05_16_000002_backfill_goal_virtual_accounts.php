<?php

use App\Domains\Finance\Models\Account;
use App\Domains\Finance\Models\FinancialGoal;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // 1. Garantir que toda meta tem subconta virtual (idempotente).
        FinancialGoal::withoutGlobalScopes()->each(function (FinancialGoal $goal) {
            if ($goal->virtualAccount) {
                return;
            }
            Account::create([
                'user_id'           => $goal->user_id,
                'name'              => $goal->name,
                'type'              => 'goal',
                'balance_encrypted' => 0,
                'currency'          => 'BRL',
                'is_internal'       => true,
                'goal_id'           => $goal->id,
            ]);
        });

        // 2. Migrar TransactionGoals legados (transaction_id IS NULL):
        //    Converter em par de transfer entre conta padrão (primeira não-internal) e subconta virtual.
        DB::table('transaction_goal')->whereNull('transaction_id')->orderBy('id')->each(function ($row) {
            $goal = FinancialGoal::find($row->financial_goal_id);
            if (! $goal || ! $goal->virtualAccount) {
                return;
            }

            $source = Account::where('user_id', $goal->user_id)
                ->where('is_internal', false)
                ->orderBy('id')
                ->first();

            if (! $source) {
                // Sem conta de origem detectável: pular sem falhar.
                return;
            }

            $amount = (float) decrypt($row->amount_encrypted);

            DB::transaction(function () use ($source, $goal, $row, $amount) {
                $virtual = $goal->virtualAccount;
                $encryptedAmount = encrypt((string) $amount);
                $description = $row->note ?? 'Aporte migrado';
                $occurredAt = $row->occurred_at ?? now()->toDateString();

                $outgoingId = DB::table('transactions')->insertGetId([
                    'account_id'             => $source->id,
                    'type'                   => 'transfer',
                    'amount_encrypted'       => $encryptedAmount,
                    'transfer_to_account_id' => $virtual->id,
                    'description'            => $description,
                    'category'               => null,
                    'occurred_at'            => $occurredAt,
                    'created_at'             => $row->created_at,
                    'updated_at'             => $row->updated_at,
                ]);

                $incomingId = DB::table('transactions')->insertGetId([
                    'account_id'       => $virtual->id,
                    'type'             => 'transfer',
                    'amount_encrypted' => $encryptedAmount,
                    'transfer_pair_id' => $outgoingId,
                    'description'      => $description,
                    'category'         => null,
                    'occurred_at'      => $occurredAt,
                    'created_at'       => $row->created_at,
                    'updated_at'       => $row->updated_at,
                ]);

                DB::table('transactions')->where('id', $outgoingId)->update(['transfer_pair_id' => $incomingId]);

                DB::table('transaction_goal')->where('id', $row->id)->delete();
            });
        });
    }

    public function down(): void
    {
        // Reversão não é automatizada — aportes migrados não são restaurados.
        // Para reverter manualmente:
        //   - apagar transactions de type=transfer ligadas a accounts com is_internal=true e goal_id não nulo
        //   - apagar accounts onde is_internal=true e goal_id não nulo
    }
};
