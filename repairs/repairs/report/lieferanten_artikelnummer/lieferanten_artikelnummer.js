frappe.query_reports["Lieferanten-Artikelnummer"] = {
    "filters":
	[{
            "fieldname":"item",
            "label": __("Artikelnummer"),
            "fieldtype": "Link",
	    "options": "Item"
	},
	{
		"fieldname":"from_date",
		"label": __("From Date"),
		"fieldtype": "Date",
		"width": "80",
		"reqd": 1,
		"default": frappe.datetime.add_months(frappe.datetime.get_today(), -1),
	},
	{
		"fieldname":"to_date",
		"label": __("To Date"),
		"fieldtype": "Date",
		"width": "80",
		"reqd": 1,
		"default": frappe.datetime.get_today()
	}]
}
