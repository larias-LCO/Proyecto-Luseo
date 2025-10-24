import { Router } from '@angular/router';

export class RouterAccessor {
  private static _router: Router | null = null;

  static setRouter(router: Router) {
    this._router = router;
  }

  static get router(): Router {
    if (!this._router) {
      throw new Error('Router no inicializado');
    }
    return this._router;
  }
}
