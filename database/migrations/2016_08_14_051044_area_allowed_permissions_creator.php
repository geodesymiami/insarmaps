<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;

class AreaAllowedPermissionsCreator extends Migration {
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up() {
        Schema::create('area_allowed_permissions', function (Blueprint $table) {
            $table->increments('id');
            $table->integer("area_id");
            $table->string("permission");
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down() {
        Schema::drop('area_allowed_permissions');
    }
}
