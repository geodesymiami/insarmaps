<?php

use Illuminate\Database\Seeder;

class AreaAllowedPermissionsSeeder extends Seeder {
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run() {
        //
        DB::table('area_allowed_permissions')->insert([
            'area_id' => 97,
            'permission' => "rsmas",
        ]);
    }
}
