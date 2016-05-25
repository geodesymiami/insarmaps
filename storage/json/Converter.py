import json
import h5py
import numpy as np
from datetime import date
import math
import time
import os
import sys

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
	x = np.array(decimal_dates)	
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
			point_num = row * col + col
			displacement_values = []
			# get displacement values for all the dates
			for key in dataset_keys:
				displacement = float(timeseries_datasets[key][row][col])
				displacement_values.append(displacement)

			# np array of displacement values, y parameter in linear regression equation
			y = np.array(displacement_values)

			# linear regression calculation example:
			# http://docs.scipy.org/doc/numpy-1.10.0/reference/generated/numpy.linalg.lstsq.html
			# y = mx + c -> we want m = slope of the linear regression line 
			A = np.vstack([x, np.ones(len(x))]).T
			m, c = np.linalg.lstsq(A, y)[0]

			data = {
   			"type": "Feature",
   			"geometry": {"type": "Point", "coordinates": [latitude, longitude]},	
   			"properties": {"d": displacement_values, "m": m, "c": chunk_num, "p": point_num}
			}	
			# allocate memory space for siu_man array in beginning 
			siu_man.append(data)

			# if chunk_size limit is reached, write chunk into a json file
			# then increment chunk number and clear siu_man array
			if len(siu_man) == chunk_size:
				make_json_file(chunk_num, siu_man)
				chunk_num += 1
				siu_man = []

	# write the last chunk that might be smaller than chunk_size
	make_json_file(chunk_num, siu_man)

# ---------------------------------------------------------------------------------------
# create a json file out of siu man array
# then put json file into directory named after the h5 file
def make_json_file(chunk_num, points): 

	data = {
	"type": "FeatureCollection",
	"dates": dataset_keys, 
	"features": points
	}

	# remove '.h5' from the end of file_name
	file = "chunk_ " + str(chunk_num) + ".json"
	json_file = open(path_name + "/" + file, "w")
	string_json = json.dumps(data, json_file, indent=4, separators=(',',':'))
	json_file.write("%s" % string_json)
	json_file.close()

# ---------------------------------------------------------------------------------------
# START OF EXECUTABLE
# ---------------------------------------------------------------------------------------
# get name of h5 file and the groupname of that file's data
if (len(sys.argv) != 4):
	print "Incorrect number of arguments - see correct example below:"
	print "example: python Converter.py geo_timeseries_masked.h5 timeseries /Users/zishiwu/Desktop/data"
	sys.exit()

file_name = sys.argv[1]
group_name = sys.argv[2]
path_name = sys.argv[3]
# ---------------------------------------------------------------------------------------
# use h5py to open a sepcified group in the h5 file 
# then read datasets from h5 file into memory for faster reading of data
file = h5py.File(file_name,  "r")
try: 
	group = file[group_name]
except: 
	print "unable to find group: %s" % group_name
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

# read and convert the datasets, then write them into json
convert_data()

# ---------------------------------------------------------------------------------------
# check how long it took to read h5 file data and create json files
end_time =  time.clock()
print ("time elapsed: " + str(end_time - start_time))
# ---------------------------------------------------------------------------------------
