#! /usr/bin/env python

import psycopg2
import sys
import getopt
import os

class InsarDatabaseController:
	def __init__(self, username, password, host, db):
		self.username = username
		self.password = password
		self.host = host
		self.db = db
		self.con = None
		self.cursor = None

	def connect(self):
		try:
			self.con = psycopg2.connect("dbname='pgis' user='" + self.username + "' host='" + self.host + "' password='" + self.password + "'")
			self.cursor = self.con.cursor()
		except Exception, e:
			print "Error While Connecting"
			print e
			sys.exit()

	def close(self):
		self.con.close()
		self.con = None
		self.cursor = None

	def get_dataset_names(self):
		sql = "SELECT * FROM area"
		self.cursor.execute(sql)

		return self.cursor.fetchall()

	def get_dataset_id(self, dataset):
		sql = "SELECT id from area WHERE area.project_name = '" + dataset + "'"
		self.cursor.execute(sql)

		return self.cursor.fetchone()[0]

	def table_exists(self, table):
		sql = "SELECT exists(SELECT * FROM information_schema.tables WHERE table_name=%s)"
		self.cursor.execute(sql, (table,))

		return self.cursor.fetchone()[0]

	def attribute_exists_for_dataset(self, dataset, attributekey):
		dataset_id = self.get_dataset_id(dataset)

		sql = "SELECT exists(SELECT attributekey FROM extra_attributes WHERE area_id = " + str(dataset_id) + " AND attributekey = '" + attributekey + "');"
		self.cursor.execute(sql)

		return self.cursor.fetchone()[0]

	def add_attribute(self, dataset, attributekey, attributevalue):
		dataset_id = self.get_dataset_id(dataset)
		sql = ""
		prepared_values = None

		if not self.table_exists("extra_attributes"):
			sql = "CREATE TABLE IF NOT EXISTS extra_attributes (area_id integer, attributekey varchar, attributevalue varchar);"
			self.cursor.execute(sql)
			self.con.commit()

		if not self.attribute_exists_for_dataset(dataset, attributekey):
			sql = "INSERT INTO extra_attributes VALUES (%s, %s, %s);"
			prepared_values = (str(dataset_id), attributekey, attributevalue)
		else:
			sql = "UPDATE extra_attributes SET attributevalue = %s WHERE area_id = %s AND attributekey = %s"
			prepared_values = (attributevalue, str(dataset_id), attributekey)

		self.cursor.execute(sql, prepared_values)
		self.con.commit()

	def index_table_on(self, table, on):
		# can't remove single quotes from table name, so we do it manually
		sql = "CREATE INDEX area_id_idx ON " + table + " (" + on + ");"

		try:
			self.cursor.execute(sql)
			self.con.commit()
		# index exists most probably if exception thrown
		except Exception, e:
			pass
			

def usage():
	print "add_atributes.py -u USERNAME -p PASSWORD -h HOST -d DB -f FILE"

def parse_file_for_attributes(file):
	attributes_dict = {}

	with open(file) as f:
		file_contents = f.readlines()

		for line in file_contents:
			if line != '\n':
				key_value = line.split("=") # index 0 is key, 1 is value

				if key_value[1][-1] == '\n':
					key_value[1] = key_value[1][:-1]
					key_value[1] = key_value[1].lstrip() # take out leading whitespace

				attributes_dict[key_value[0]] = key_value[1]

	return attributes_dict

def main(argv):
	username = None
	password = None
	host = None
	db = None
	working_dir = None

	try:
		opts, extraArgs = getopt.getopt(argv[1:],'u:p:h:d:f:')
	except getopt.GetoptError:
		print 'Error while retrieving operations - exit'
		usage()
		sys.exit()

	for o, a in opts:
		if o == '-u':
			username = a
		elif o == '-p':
			password = a
		elif o == '-h':
			host = a
		elif o == '-d':
			db = a
		elif o == '-f':
			working_dir = a
		else:
			assert False, "unhandled option " + o + " - exit"
			sys.exit()

	# make sure we have a final / so the below code doesn't break
	if working_dir[-1] != "/":
		working_dir += "/"

	project_name = working_dir.split("/")[-2]
	attributes_file = working_dir + "add_Attribute.txt"
	attributes = parse_file_for_attributes(attributes_file)
	dbController = InsarDatabaseController(username, password, host, db)	
	dbController.connect()

	for key in attributes:
		print "Setting attribute " + key + " to " + attributes[key]
		dbController.add_attribute(project_name, key, attributes[key])

	dbController.index_table_on("extra_attributes", "area_id")
	dbController.close()

if __name__ == '__main__':
	main(sys.argv)
