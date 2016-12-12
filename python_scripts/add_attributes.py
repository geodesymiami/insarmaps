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

	def table_exists(self, table):
		sql = "select exists(select * from information_schema.tables where table_name=%s)"
		self.cursor.execute(sql, (table,))

		return self.cursor.fetchone()[0]

	def add_attribute(self, dataset, attributekey, attributevalue):
		pass

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

	print dbController.table_exists("area")

	dbController.close()

if __name__ == '__main__':
	main(sys.argv)