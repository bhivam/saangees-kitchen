I need to have items in my menu.
This means that I need a table of items that I can create
Items will repeat so I should be able to add items to a big old table of items that I can keep reusing.

I'll be able to associate an item with a date.
This means I need a table that does date to item id association. That table will be unique on those two columns.
I will query for menus on a timespan and get a list of associated items with dates

Items also need some default expiration time. if an item was for today but it is 11pm. you will not be able to order that item.

Item ordering validation needs to check if an item has been

Items need modifiers that can be associated with them. This means we need a way to specify a list of options that users can pick to change their item.

MENU MANAGEMENT
create schema for item and modifers. discuss modifiers with mom.
create screen for item/modifer creation.

ORDER MANAGEMENT
viewing placed orders
adding external orders

CUSTOMER ORDERING
menu display
cart
checkout (calculations, payment)
text receipt/confirmation

for an order you want an entity that you can associate an item with. But then you also have modifiers.


We can use shadcn Menu whatever groups or sub menu whatevers to create a menu seciton, with an "items manager", "modifier manager", "published menu manager", "customer view", etc. 

There are actually many pieces of functionality. React query will hopefully alow us to make a more seamless experience where things load in fast since all query results are cached and being hydrated over time. 
