import styles from './KanbanBoard.module.css';
export function KanbanBoard({columns}){return <div className={styles.root}>{columns.map(column=><section key={column.title}><h3>{column.title}</h3>{column.cards.map(card=><article key={card}>{card}</article>)}</section>)}</div>;}
