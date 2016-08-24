<?php

use Illuminate\Database\Seeder;

class AreaAllowedPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        //
        DB::table('area_allowed_permissions')->insert([
            'area_name' => "Alos_SM_422_650_20070106_20110117",
            'permission' => "rsmas"
        ]);
    }
}
