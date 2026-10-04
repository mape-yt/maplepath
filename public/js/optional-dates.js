// Unknown dates remain blank. No extra personal data or uncertainty flag is stored.
(function(){
    const localToday=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
    document.querySelectorAll('input[type="date"][data-optional-date]').forEach(input=>{
        input.required=false;
        const tools=document.createElement('div');tools.className='date-tools';
        const add=(label,value)=>{
            const button=document.createElement('button');button.type='button';button.textContent=label;
            button.addEventListener('click',()=>{input.value=value();input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));input.focus();});
            tools.appendChild(button);
        };
        if(input.hasAttribute('data-date-today'))add('Today',localToday);
        add('I don’t remember',()=> '');
        input.insertAdjacentElement('afterend',tools);
    });
})();
