<?php

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
    	DB::table('users')->insert([
            'name' => "rsmas",
            'email' => "rsmas".'@gmail.com',
            'password' => bcrypt('rsmastest'),
        ]);
        // $this->call(UsersTableSeeder::class);
        $this->call(UserPermissionsTableSeeder::class);
        $this->call(AreaAllowedPermissionsSeeder::class);
    }
}
