#! /usr/bin/env python

import sys
import argparse
from pysar.add_attributes_insarmaps import InsarDatabaseController
import os

dbUsername = "INSERT"
dbPassword = "INSERT"
dbHost = "INSERT"

def build_parser():
    dbHost = "insarmaps.rsmas.miami.edu"
    parser = argparse.ArgumentParser(description='Convert a Unavco format     H5 file for ingestion into insarmaps.')
    parser.add_argument("-f", "--folder", help="folder containing json to upload. The folder name will be used as the table name in the db to upload, so it should be as provided by unavco2json_mbtiles.py", required=False)
    parser.add_argument("-m", "--mbtiles", help="mbtiles file to upload", required=False)
    required = parser.add_argument_group("required arguments")
    required.add_argument("-u", "--user", help="username for the insarmaps database", required=True)
    required.add_argument("-p", "--password", help="password for the insarmaps database", required=True)
    required.add_argument("--host", default=dbHost, help="postgres DB URL     for insarmaps database", required=True)

    return parser

def upload_json(folder_name):
    global dbUsername, dbPassword, dbHost

    for json_chunk in os.listdir(folder_name):
# insert json file to pgsql using ogr2ogr - folder_name == area unavco_name
        command = 'ogr2ogr -append -f "PostgreSQL" PG:"dbname=pgis host=' + dbHost + ' user=' + dbUsername + ' password=' + dbPassword + '" --config PG_USE_COPY YES -nln "' + folder_name + '" ' + folder_name + '/' + json_chunk

        res = os.system(command)
        print command

        if res != 0:
            print "Error inserting into the database. This is most often due to running out of Memory (RAM), or incorrect database credentials... quitting"
            sys.exit()

        print "Inserted " + json_chunk + " to db"

def main():
    global dbUsername, dbPassword, dbHost

    parser = build_parser()
    parseArgs = parser.parse_args()
    dbUsername = parseArgs.user
    dbPassword = parseArgs.password
    dbHost = parseArgs.host
    folder_name = parseArgs.folder

    if parseArgs.folder:
        attributesController = InsarDatabaseController(dbUsername, dbPassword, dbHost, 'pgis')
        attributesController.connect()
        if attributesController.table_exists(folder_name):
            print "Deleting old timeseries table"
            attributesController.remove_point_table_if_there(folder_name)
        attributesController.close()
 
        upload_json(parseArgs.folder)

if __name__ == '__main__':
    main()
