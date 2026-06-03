<?php

namespace Tests\Feature\Projects;

use App\Domains\Auth\Models\User;
use App\Domains\Projects\Models\Project;
use App\Domains\Projects\Models\ProjectColumn;
use App\Domains\Projects\Models\ProjectTask;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectProgressTest extends TestCase
{
    use RefreshDatabase;

    public function test_name_is_done_detects_done_columns(): void
    {
        $this->assertTrue(ProjectColumn::nameIsDone('Concluído'));
        $this->assertTrue(ProjectColumn::nameIsDone('concluida'));
        $this->assertTrue(ProjectColumn::nameIsDone('Done'));
        $this->assertTrue(ProjectColumn::nameIsDone('DONE — entregue'));
        $this->assertFalse(ProjectColumn::nameIsDone('A fazer'));
        $this->assertFalse(ProjectColumn::nameIsDone('Em progresso'));
        $this->assertFalse(ProjectColumn::nameIsDone(null));
    }
}
