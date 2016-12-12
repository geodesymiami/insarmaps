#! /usr/bin/env python

import psycopg2
import sys
import getopt

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
		sql = "SELECT id from area WHERE area.unavco_name = '" + dataset + "'"
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

		if not self.table_exists("extra_attributes"):
			sql = "CREATE TABLE IF NOT EXISTS extra_attributes (area_id integer, attributekey varchar, attributevalue varchar);"
			self.cursor.execute(sql)
			self.con.commit()

		if not self.attribute_exists_for_dataset(dataset, attributekey):
			sql = "INSERT INTO extra_attributes VALUES (" + str(dataset_id) + ", '" + attributekey + "', '" + attributevalue + "');"
		else:
			sql = "UPDATE extra_attributes SET attributevalue = '" + attributevalue + "' WHERE area_id = " + str(dataset_id) + " AND attributekey = '" + attributekey + "'"

		self.cursor.execute(sql)
		self.con.commit()

def usage():
	print "add_atributes.py -u USERNAME -p PASSWORD -h HOST -d DB -f FILE"

def main(argv):
	username = None
	password = None
	host = None
	db = None
	attributes_file = None

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
		elif o == 'f':
			attributes_file = a
		else:
			assert False, "unhandled option " + o + "- exit"
			sys.exit()

	dbController = InsarDatabaseController(username, password, host, db)
	dbController.connect()

	#dbController.add_attribute("Alos_SM_73_2950_2990_20070107_20110420", "testkey", "testvalue")

	dbController.close()

if __name__ == '__main__':
	main(sys.argv)