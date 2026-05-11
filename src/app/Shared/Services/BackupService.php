<?php

namespace App\Shared\Services;

use RuntimeException;

class BackupService
{
    private array $retention = ['daily' => 7, 'weekly' => 4, 'monthly' => 3];

    public function run(string $type): string
    {
        $filename = $this->filename($type);
        $dir = '/backups/' . $type;

        if (!is_dir($dir)) {
            mkdir($dir, 0750, true);
        }

        $path = "{$dir}/{$filename}";

        $db = config('database.connections.pgsql.database');
        $host = config('database.connections.pgsql.host');
        $port = (string) config('database.connections.pgsql.port');
        $user = config('database.connections.pgsql.username');
        $password = config('database.connections.pgsql.password');
        $passphrase = config('backup.passphrase');

        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        $env = array_merge($_ENV, ['PGPASSWORD' => $password]);

        $dumpProc = proc_open(
            ['pg_dump', '-h', $host, '-p', $port, '-U', $user, '-Fp', $db],
            $descriptors,
            $dumpPipes,
            null,
            $env
        );

        if (!is_resource($dumpProc)) {
            throw new RuntimeException('Não foi possível iniciar pg_dump');
        }

        fclose($dumpPipes[0]);

        $gzipProc = proc_open(
            ['gzip'],
            [0 => $dumpPipes[1], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $gzipPipes
        );

        if (!is_resource($gzipProc)) {
            proc_close($dumpProc);
            throw new RuntimeException('Não foi possível iniciar gzip');
        }

        $gpgProc = proc_open(
            ['gpg', '--batch', '--yes', '--symmetric',
             '--cipher-algo', 'AES256',
             '--passphrase', $passphrase,
             '-o', $path],
            [0 => $gzipPipes[1], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $gpgPipes
        );

        if (!is_resource($gpgProc)) {
            proc_close($gzipProc);
            proc_close($dumpProc);
            throw new RuntimeException('Não foi possível iniciar gpg');
        }

        fclose($gpgPipes[1]);
        fclose($gpgPipes[2]);
        fclose($gzipPipes[2]);
        fclose($dumpPipes[2]);

        $gpgCode = proc_close($gpgProc);
        $gzipCode = proc_close($gzipProc);
        $dumpCode = proc_close($dumpProc);

        if ($dumpCode !== 0 || $gzipCode !== 0 || $gpgCode !== 0) {
            throw new RuntimeException(
                "Backup falhou: pg_dump={$dumpCode}, gzip={$gzipCode}, gpg={$gpgCode}"
            );
        }

        return $path;
    }

    public function pruneOld(string $type): void
    {
        $files = glob('/backups/' . $type . '/*.gpg') ?: [];
        rsort($files);

        foreach (array_slice($files, $this->retention[$type]) as $file) {
            unlink($file);
        }
    }

    private function filename(string $type): string
    {
        return match ($type) {
            'daily'   => 'vaultus_' . now()->format('Y-m-d') . '.sql.gz.gpg',
            'weekly'  => 'vaultus_' . now()->format('Y-\WW') . '.sql.gz.gpg',
            'monthly' => 'vaultus_' . now()->format('Y-m') . '.sql.gz.gpg',
        };
    }
}
