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
			# get displacement values for all the dates
			for key in dataset_keys:
				displacement = float(timeseries_datasets[key][row][col])
				displacement_values.append(displacement)

			# np array of displacement values, y parameter in linear regression equation
			y = displacement_values

			# y = mx + c -> we want m = slope of the linear regression line 
			m, c = np.linalg.lstsq(A, y)[0]

			data = {
   			"type": "Feature",
   			"geometry": {"type": "Point", "coordinates": [latitude, longitude]},	
   			"properties": {"d": displacement_values, "m": m, "c": chunk_num, "p": point_num}
			}	
			# allocate memory space for siu_man array in beginning 
			siu_man.append(data)

			# clear displacement array for next point
			displacement_values = []
			point_num += 1
			# if chunk_size limit is reached, write chunk into a json file
			# then increment chunk number and clear siu_man array
			if len(siu_man) == chunk_size:
				make_json_file(chunk_num, siu_man)
				chunk_num += 1
				point_num = 0
				siu_man = []

	# write the last chunk that might be smaller than chunk_size
	make_json_file(chunk_num, siu_man)

	# calculate mid lat and long of dataset - then use google python lib to get country
	mid_lat = x_first + ((num_columns/2) * x_step)
	mid_long = y_first + ((num_rows/2) * y_step)
	g = geocoder.google([mid_long,mid_lat], method='reverse')
 	country = str(g.country_long)

	# put area data into database
	area_data = {"latitude": mid_lat, "longitude": mid_long, "country": country}
	print "Country: " + area_data['country']

	# debugging this one line took 1 hour...
	print "num_chunks: " + str(chunk_num)
	area_data_string = json.dumps(area_data, indent=4, separators=(',',':'))
	cur.execute('INSERT INTO area VALUES (' + "'" + folder_name + "','" + area_data_string + "','" + chunk_num + "')")
	con.commit()

# ---------------------------------------------------------------------------------------
# create a json file out of siu man array
# then put json file into directory named after the h5 file
def make_json_file(chunk_num, points): 

	data = {
	"type": "FeatureCollection",
	# "dates": dataset_keys, 
	"string_dates": dataset_keys, 
	"decimal_dates": decimal_dates,
	"features": points
	}

	# remove '.h5' from the end of file_name
	chunk = "chunk_" + str(chunk_num) + ".json"
	json_file = open(path_name + "/" + chunk, "w")
	string_json = json.dumps(data, indent=4, separators=(',',':'))
	try:
		cur.execute('INSERT INTO ' + folder_name + ' VALUES (' + str(chunk_num) +',' + "'" + string_json + "')")
		con.commit()
	except Exception, e:
		print "failed to insert chunk " + str(chunk_num)
		print str(e)

	json_file.write("%s" % string_json)
	json_file.close()
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

# get the attributes of the group
x_step = float(group.attrs["X_STEP"])
y_step = float(group.attrs["Y_STEP"])
x_first = float(group.attrs["X_FIRST"])
y_first = float(group.attrs["Y_FIRST"])
num_columns = int(group.attrs["WIDTH"])
num_rows = int(group.attrs["FILE_LENGTH"])
print "columns: %d" % num_columns
print "rows: %d" % num_rows
print 

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

# set number of points per json chunk
chunk_size = 20000

file.close()	

# check if directory to put json files exists in specified path - if not, create it
# example: python Converter.py geo_timeseries_masked.h5 timeseries /Users/zishiwu/Desktop
# creates /Users/zishiwu/Desktop/geo_timeseries_masked folder to put json files in
does_exist = os.path.isdir(path_name)
print path_name + " already exists?"
print does_exist

if not does_exist:
	json_directory = os.mkdir(path_name)

# connect to postgresql database
con = None
cur = None
folder_name = path_name.split("/")
mbtiles_path = folder_name[len(folder_name)-2] + "/mbtiles" # path of folder containing all folders that have mbtiles

try: 
	os.mkdir(mbtiles_path)
except:
	print mbtiles_path + " already exists"

folder_name = folder_name[len(folder_name)-1] # name of folder containing an mbtible converted from h5
try:
	con = psycopg2.connect("dbname='point' user='aterzishi' host='insarvmcsc431.cloudapp.net' password='abc123'")
	cur = con.cursor()
	# create area table if not exist
	cur.execute("CREATE TABLE IF NOT EXISTS area ( name varchar, data json, num_chunks integer );")
	con.commit()
	# create table named after h5 dataset area - take out .h5
	query = 'CREATE TABLE IF NOT EXISTS ' + folder_name + '( id integer, data json );'
	print query
	cur.execute(query)
	con.commit()
	print "created table"
except Exception, e:
	print "unable to connect to the database"
	print e
	sys.exit()

# read and convert the datasets, then write them into json files and insert into database
convert_data()
con.close()

# run tippecanoe command to get mbtiles file and then delete the json files to save space
os.chdir(mbtiles_path)
os.system("tippecanoe *.json -x d -pf -pk -Bg -d9 -D12 -g12 -r0 -o " + folder_name + ".mbtiles")
os.system("rm -rf *.json")

# ---------------------------------------------------------------------------------------
# check how long it took to read h5 file data and create json files
end_time =  time.clock()
print ("time elapsed: " + str(end_time - start_time))
# ---------------------------------------------------------------------------------------
