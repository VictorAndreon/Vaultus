<?php

namespace Database\Seeders;

use App\Domains\Auth\Models\User;
use App\Domains\Library\Models\LibraryItem;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Segue o fluxo real de capas: arquivo .webp local em covers/{user}/{uuid}.webp
 * (mesma convenção do BookCoverService) referenciado por cover_path, com
 * cover_url nulo — a exibição passa pela rota library.cover via accessor
 * cover_display_url. Um livro fica sem capa de propósito (testa o fallback .ph).
 */
class LibrarySeeder extends Seeder
{
    private const DISK = 'public';

    public function run(): void
    {
        $user = User::first();
        if (! $user) {
            return;
        }

        $tz    = $user->timezone ?? 'America/Sao_Paulo';
        $today = Carbon::today($tz);

        // Idempotente: remove itens e os arquivos de capa órfãos.
        Storage::disk(self::DISK)->deleteDirectory("covers/{$user->id}");
        LibraryItem::withTrashed()->where('user_id', $user->id)->forceDelete();

        $d = fn(int $daysAgo) => $today->copy()->subDays($daysAgo)->toDateString();

        // [título, autor, gênero, status, total, página, started, finished, rating, tons da capa]
        $books = [
            ['Hábitos Atômicos', 'James Clear', 'Produtividade', 'reading', 320, 210, $d(40), null, null, ['#2f6b4f', '#9fd3b4']],
            ['O Programador Pragmático', 'Andy Hunt & Dave Thomas', 'Tecnologia', 'reading', 352, 96, $d(12), null, null, ['#1f3a5f', '#8fb7e8']],
            ['Essencialismo', 'Greg McKeown', 'Produtividade', 'reading', 272, 30, $d(3), null, null, null], // sem capa — fallback .ph

            ['Trabalho Focado', 'Cal Newport', 'Produtividade', 'done', 304, 304, $d(90), $d(30), 5, ['#5f2f2f', '#e8a98f']],
            ['O Poder do Hábito', 'Charles Duhigg', 'Comportamento', 'done', 408, 408, $d(160), $d(120), 4, ['#4f4f2f', '#d9d98f']],
            ['A Startup Enxuta', 'Eric Ries', 'Negócios', 'done', 274, 274, $d(230), $d(200), 3, ['#3a2f5f', '#b39fe8']],

            ['Pense de Novo', 'Adam Grant', 'Comportamento', 'queue', 320, null, null, null, null, ['#2f5f5a', '#8fe8dc']],
            ['Rápido e Devagar', 'Daniel Kahneman', 'Psicologia', 'queue', 608, null, null, null, null, ['#5f4a2f', '#e8c98f']],

            ['Guerra e Paz', 'Liev Tolstói', 'Literatura', 'abandoned', 1504, 180, $d(150), null, null, ['#444444', '#aaaaaa']],
        ];

        foreach ($books as [$title, $author, $genre, $status, $total, $page, $started, $finished, $rating, $tones]) {
            LibraryItem::create([
                'user_id'      => $user->id,
                'type'         => 'book',
                'title'        => $title,
                'author'       => $author,
                'genre'        => $genre,
                'status'       => $status,
                'total_pages'  => $total,
                'current_page' => $page,
                'started_at'   => $started,
                'finished_at'  => $finished,
                'rating'       => $rating,
                'cover_path'   => $tones ? $this->makeCover($user->id, $tones[0], $tones[1]) : null,
                'cover_url'    => null,
            ]);
        }
    }

    /** Gera uma capa .webp 320×480 (gradiente vertical duotone) no storage público. */
    private function makeCover(int $userId, string $hexTop, string $hexBottom): string
    {
        [$r1, $g1, $b1] = sscanf($hexTop, '#%02x%02x%02x');
        [$r2, $g2, $b2] = sscanf($hexBottom, '#%02x%02x%02x');

        $w = 320;
        $h = 480;
        $img = imagecreatetruecolor($w, $h);

        for ($y = 0; $y < $h; $y++) {
            $t = $y / ($h - 1);
            $color = imagecolorallocate(
                $img,
                (int) round($r1 + ($r2 - $r1) * $t),
                (int) round($g1 + ($g2 - $g1) * $t),
                (int) round($b1 + ($b2 - $b1) * $t),
            );
            imageline($img, 0, $y, $w, $y, $color);
        }

        // Faixa clara no terço superior, lembrando uma lombada editorial.
        $band = imagecolorallocatealpha($img, 255, 255, 255, 96);
        imagefilledrectangle($img, 0, (int) ($h * 0.30), $w, (int) ($h * 0.34), $band);

        ob_start();
        imagewebp($img, null, 80);
        $webp = (string) ob_get_clean();
        imagedestroy($img);

        $path = sprintf('covers/%d/%s.webp', $userId, Str::uuid());
        Storage::disk(self::DISK)->put($path, $webp);

        return $path;
    }
}
