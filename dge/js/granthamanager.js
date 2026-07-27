export class GranthaManager{
async loadCatalog(){const r=await fetch('data/granthas.json');this.catalog=await r.json();return this.catalog;}
async loadDefault(){if(!this.catalog)await this.loadCatalog();this.current=this.catalog.granthas.find(g=>g.id===this.catalog.defaultGrantha);return this.current;}
async loadCurrent(){if(!this.current)await this.loadDefault();return {config:await (await fetch(this.current.config)).json(),data:await (await fetch(this.current.dataset)).json()};}
}
