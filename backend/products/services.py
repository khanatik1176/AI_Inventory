def generate_excerpt(product):
    return (
        f"{product.brand_name} {product.product_name} in {product.color} – "
        f"{product.product_type} at only {product.sale_price}."
    )

def generate_meta_description(product):
    return (
        f"Buy {product.brand_name} {product.product_name} "
        f"({product.model_number}). Available in {product.color}. Order now."
    )
