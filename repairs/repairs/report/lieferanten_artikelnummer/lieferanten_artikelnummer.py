# Copyright (c) 2013, libracore AG and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe

def execute(filters=None):
	columns, data = [], get_data(filters)
	columns = [
	"Item Code:Link/Item:200",
	"Item Name::200",
	"Lieferantenartikelnummer::200",
	"Bestand::200",
	"Ausgang::200"]
	items = get_items(filters)
	stock = get_stock_ledger_entries(filters, items)
	return columns, data

def get_data(filters):
	conditions = " 1 = 1"
	if filters.get('item'):
		conditions += " and `tabItem`.item_code = '{0}'".format(filters.get('item'))

	return frappe.db.sql("""SELECT `tabItem`.item_code, item_name, supplier_part_no, actual_qty, qty_after_transaction from `tabItem` 
				left join `tabItem Supplier` on `tabItem Supplier`.parent = `tabItem`.item_code
				left join `tabStock Ledger Entry` on `tabItem`.item_code = `tabStock Ledger Entry`.item_code where {} """.format(conditions),as_list=1)

def get_stock_ledger_entries(filters, items):
	item_conditions_sql = ' and `tabItem`.item_code in ({})'.format(', '.join([frappe.db.escape(i, percent=False) for i in items]))

	conditions = get_conditions(filters)

	return frappe.db.sql("""SELECT item_code, warehouse, posting_date, actual_qty, valuation_rate, company, voucher_type, qty_after_transaction, stock_value_difference, item_code as name, voucher_no 
			from `tabStock Ledger Entry` where docstatus < 2 order by posting_date, posting_time, creation, actual_qty""" % (item_conditions_sql, conditions), as_dict=1)

def get_items(filters):
	items = frappe.db.sql_list("select name from `tabItem` item where {}".format, filters)
	return items
