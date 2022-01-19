import { ProductsService } from './../products/services/products.service';
import { Router } from '@angular/router';
import { ShoppingCartService } from './../../shared/services/shopping-cart.service';
import { Product } from './../products/interfaces/product.interface';
import { Order, Details, DetailsOrder } from './../../shared/interface/order.interface';
import { delay, switchMap, tap } from 'rxjs/operators';
import { DataService } from './../../shared/services/data.service';
import { Component, OnInit } from '@angular/core';
import { Store } from 'src/app/shared/interface/store.interface';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit {
  model = {
    name:'',
    store:'',
    shippingAdress:'',
    city:''
  };
  cart: Product[] = []
  isDelivery = true;
  stores: Store[] = []

  constructor(
    private dataService: DataService,
    private shoppingCartService: ShoppingCartService,
    private router: Router,
    private productService: ProductsService
    ) {
      this.checkIfCartIsEmpty();
     }

  ngOnInit(): void {
    this.getStores();
    this.getDataCart();
    this.prepareDetails() ;
  }

  onPickupOrDelivery(value: boolean): void {
    this.isDelivery = value;
  }

  onSubmit({value: formData}: NgForm): void {
    console.log('Guardar', formData);
    const data: Order= {
      ... formData,
      date: this.getCurrentDate(),
      isDelivery: this.isDelivery
    }
    this.dataService.saveOrder(data)
    .pipe(
      tap(res => console.log('order ->', res)),
      switchMap( ({id:orderId}) => {
        const details = this.prepareDetails();
        return this.dataService.saveDetailsOrder({details, orderId});
      }),
      tap(() => this.router.navigate(['/checkout/thank-you-page'])),
      delay(2000),
      tap( () => this.shoppingCartService.resertCart())
    )
    .subscribe();
  }

  private getStores(): void {
    this.dataService.getStores()
    .pipe(
      tap((stores: Store[]) => this.stores = stores))
    .subscribe()
  }

  private getCurrentDate(): string {
    return new Date().toLocaleDateString();
  }

  private prepareDetails(): Details[] {
    const details: Details[] = [];
    this.cart.forEach((product: Product) => {
      const { id:productId, name:productName, quantity, stock } = product;
      const updateStock = (stock - quantity);
      this.productService.updateStock(productId, updateStock)
      .pipe(
        tap( () => details.push({ productId, productName, quantity }))
      )
      .subscribe()

    })
    return details;
  }

  private getDataCart(): void {
    this.shoppingCartService.cartAction$
    .pipe(
      tap((products: Product[])  => this.cart = products )
    )
    .subscribe()
  }

  private checkIfCartIsEmpty(): void {
    this.shoppingCartService.cartAction$
    .pipe(
      tap( (products: Product[]) => {
        if (Array.isArray(products) && !products.length) {
          this.router.navigate(['/products']);
        }
      } )
    )
    .subscribe()
  }
}
