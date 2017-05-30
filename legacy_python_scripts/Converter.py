#! /usr/bin/env python

import json
import h5py
import numpy as np
from datetime import date
import math
import time
import os
import sys
import psycopg2
import geocoder


dbUsername = "INSERT"
dbPassword = "INSERT"
dbHost = "INSERT"

# To convert a single h5 file to mbtile: python Converter.py <name of h5 file> timeseries <name of mbtiles file>
# To convert multiple h5 files to mbtiles: python Converter.py <name of folder of mbtiles> timeseries <name of mbtiles file>
# for naming of mbtiles file, we will eventually use the name attribute from the h5 file

# ---------------------------------------------------------------------------------------
# FUNCTIONS
# ---------------------------------------------------------------------------------------
# returns a dictionary of datasets that are stored in memory to speed up h5 read process
def get_date(date_string): 
    year = int(date_string[0:4])
    month = int(date_string[4:6])
    day = int(date_string[6:8])
    return date(year, month, day)
# ---------------------------------------------------------------------------------------
# takes a date and calculates the number of days elapsed in the year of that date
# returns year + (days_elapsed / 365), a decimal representation of the date necessary
# for calculating linear regression of displacement vs time
def get_decimal_date(d):
    start = date(d.year, 1, 1)
    return abs(d-start).days / 365.0 + d.year
# ---------------------------------------------------------------------------------------
def convert_data(): 
    # create a siu_man array to store json point objects
    siu_man = []
    displacement_values = []
    displacements = '{'
    # np array of decimal dates, x parameter in linear regression equation
    x = decimal_dates
    A = np.vstack([x, np.ones(len(x))]).T
    y = []
    chunk_num = 1
    point_num = 0

    # outer loop increments row = longitude, inner loop increments column = latitude
    for (row, col), value in np.ndenumerate(timeseries_datasets[dataset_keys[0]]):

        latitude = x_first + (col * x_step)
        longitude = y_first + (row * y_step) 
        displacement = float(value) 
        # if value is not equal to naN, create a new json point object and append to siu_man array
        if not math.isnan(displacement):
            # get displacement values for all the dates into array for json and string for pgsql
            for key in dataset_keys:
                displacement = timeseries_datasets[key][row][col]
                displacements += (str(displacement) + ",")
                displacement_values.append(float(displacement))
            displacements = displacements[:len(displacements)-2] + '}'

            # np array of displacement values, y parameter in linear regression equation
            y = displacement_values

            # y = mx + c -> we want m = slope of the linear regression line 
            m, c = np.linalg.lstsq(A, y)[0]

            data = {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [latitude, longitude]},    
            "properties": {"d": displacement_values, "m": m, "p": point_num}
            }   
            # allocate memory space for siu_man array in beginning 
            siu_man.append(data)

            # clear displacement array for json and the other string for dictionary, for next point
            displacement_values = []
            displacements = '{'
            point_num += 1

            # if chunk_size limit is reached, write chunk into a json file
            # then increment chunk number and clear siu_man array
            if len(siu_man) == chunk_size:
                make_json_file(chunk_num, siu_man)
                chunk_num += 1
                siu_man = []

    # write the last chunk that might be smaller than chunk_size
    make_json_file(chunk_num, siu_man)

    # calculate mid lat and long of dataset - then use google python lib to get country
    mid_lat = x_first + ((num_columns/2) * x_step)
    mid_long = y_first + ((num_rows/2) * y_step)
    g = geocoder.google([mid_long,mid_lat], method='reverse')
    country = str(g.country_long)
    area = folder_name

    # for some reason pgsql only takes {} not [] - format date arrays to be inserted to pgsql
    string_dates_sql = '{'
    for k in dataset_keys:
        string_dates_sql += (str(k) + ",")
    string_dates_sql = string_dates_sql[:len(string_dates_sql)-2] + '}'

    decimal_dates_sql = '{'
    for d in decimal_dates:
        decimal_dates_sql += (str(d) + ",")
    decimal_dates_sql = decimal_dates_sql[:len(decimal_dates_sql)-2] + '}'

    # put dataset into area table
    # area_data = {"latitude": mid_lat, "longitude": mid_long, "country": country, "num_chunks": chunk_num, "dates": dataset_keys}
    try:
        con = psycopg2.connect("dbname='pgis' user='" + dbUsername + "' host='" + dbHost + "' password='" + dbPassword + "'")
        cur = con.cursor()
        query = 'INSERT INTO area VALUES (' + "'" + area + "','" + str(mid_lat) + "','" + str(mid_long) + "','" + country + "','" + str(chunk_num) + "','" + string_dates_sql + "','" + decimal_dates_sql + "')"
        cur.execute(query)
        con.commit()
        con.close()
    except Exception, e:
        print "error inserting into area"
        print e
        sys.exit()
    
# ---------------------------------------------------------------------------------------
# create a json file out of siu man array
# then put json file into directory named after the h5 file
def make_json_file(chunk_num, points): 

    data = {
    "type": "FeatureCollection",
    # "dates": dataset_keys, 
    "dates": dataset_keys, 
    "features": points
    }

    chunk = "chunk_" + str(chunk_num) + ".json"
    json_file = open(json_path + "/" + chunk, "w")
    string_json = json.dumps(data, indent=4, separators=(',',':'))
    json_file.write("%s" % string_json)
    json_file.close()

    # insert json file to pgsql using ogr2ogr - folder_name = area name
    command = 'ogr2ogr -append -f "PostgreSQL" PG:"dbname=pgis host=' + dbHost + ' user=' + dbUsername + ' password=' + dbPassword + '" --config PG_USE_COPY YES -nln ' + folder_name + " "
    chunk_path = './mbtiles/' + folder_name + '/' + chunk
    os.system(command + ' ' + chunk_path)
    print "inserted chunk " + str(chunk_num) + " to db"
# ---------------------------------------------------------------------------------------
# START OF EXECUTABLE
# ---------------------------------------------------------------------------------------
# get name of h5 file and the groupname of that file's data
if (len(sys.argv) != 2):
    print "Incorrect number of arguments - see correct example below:"
    print "example: python Converter.py geo_timeseries_masked.h5"
    sys.exit()

file_name = sys.argv[1]
path_name = file_name[:len(file_name)-3]
# ---------------------------------------------------------------------------------------
# use h5py to open a sepcified group in the h5 file 
# then read datasets from h5 file into memory for faster reading of data
file = h5py.File(file_name,  "r")
try: 
    group = file["timeseries"]
    print "opened file: " + file_name
except: 
    print "not a timeseries file"
    sys.exit()

# start clock to track how long conversion process takes
start_time = time.clock()

# get the attributes for calculating latitude and longitude
x_step = float(group.attrs["X_STEP"])
y_step = float(group.attrs["Y_STEP"])
x_first = float(group.attrs["X_FIRST"])
y_first = float(group.attrs["Y_FIRST"])
num_columns = int(group.attrs["WIDTH"])
num_rows = int(group.attrs["FILE_LENGTH"])
print "columns: %d" % num_columns
print "rows: %d" % num_rows

# get all attributes to be ecn
attributes = group.attrs

# get keys
dataset_keys = group.keys()
dataset_keys.sort()

# array that stores dates from dataset_keys that have been converted to decimal
decimal_dates = []

# read datasets in the group into a dictionary of 2d arrays and intialize decimal dates
timeseries_datasets = {}
for key in dataset_keys:
    timeseries_datasets[key] = group[key][:]
    d = get_date(key)
    decimal = get_decimal_date(d)
    decimal_dates.append(decimal)

# set number of points per json chunk - then close h5 file
chunk_size = 20000
file.close()    

# connect to postgresql database
# also create folder named after h5 file to store json files in mbtiles folder
con = None
cur = None

path_list = path_name.split("/")
mbtiles_path = os.getcwd() + "/mbtiles"
folder_name = path_name.split("/")[len(path_list)-1]
json_path = mbtiles_path + "/" + folder_name

try: # create path for folder that stores all mbtiles
    os.mkdir(mbtiles_path)
except:
    print mbtiles_path + " already exists"

try: # create path for json
    os.mkdir(json_path)
except:
    print json_path + " already exists"

try:    # connect to databse
    con = psycopg2.connect("dbname='pgis' user='" + dbUsername + "' host='" + dbHost + "' password='" + dbPassword + "'")
    cur = con.cursor()
    # create area table if not exist - limit for number of dates is 200
    cur.execute("CREATE TABLE IF NOT EXISTS area ( name varchar, latitude double precision, longitude double precision, country varchar, numchunks integer, stringdates varchar[200], decimaldates double precision[200] );")
    con.commit()
    print 'created area table'
except Exception, e:
    print "unable to connect to the database"
    print e
    sys.exit()

# read and convert the datasets, then write them into json files and insert into database
convert_data()

# run tippecanoe command to get mbtiles file and then delete the json files to save space
os.chdir(os.path.abspath(json_path))
os.system("tippecanoe *.json -x d -pf -pk -Bg -d9 -D12 -g12 -r0 -o " + folder_name + ".mbtiles")
os.system("rm -rf *.json")

# move mbtiles file from json folder to mbtiles folder and then delete json folder
os.system("mv " + folder_name + ".mbtiles " + os.path.abspath(mbtiles_path))
os.system("rm -rf " + os.path.abspath(json_path))

# ---------------------------------------------------------------------------------------
# check how long it took to read h5 file data and create json files
end_time =  time.clock()
print ("time elapsed: " + str(end_time - start_time))
# ---------------------------------------------------------------------------------------
